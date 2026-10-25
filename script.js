(function () {
const BASE = 'https://www.10000recipe.com';
const API = window.BookOasisPlugin;
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; };
const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
const abs = (u) => { try { return new URL(u, BASE).href; } catch (e) { return ''; } };

async function getDoc(url) {
  const proxy = await API.getProxyUrl(url);
  if (!proxy) throw new Error('whitelist');
  const res = await fetch(proxy);
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return new DOMParser().parseFromString(await res.text(), 'text/html');
}
function errText(e) {
  return e.message === 'whitelist'
    ? '설정 > 외부 도메인에 www.10000recipe.com 을 등록해 주세요.'
    : '불러오지 못했습니다: ' + e.message;
}
function pic(src, cls) {
  const i = document.createElement('img');
  if (cls) i.className = cls;
  i.loading = 'lazy'; i.alt = '';
  i.src = API.getCachedImageUrl(src) || '';
  i.onerror = () => i.remove();
  return i;
}

function parseList(doc) {
  const seen = new Set(), out = [];
  doc.querySelectorAll('a[href*="/recipe/"]').forEach((a) => {
    const m = (a.getAttribute('href') || '').match(/\/recipe\/(\d+)/);
    const im = a.querySelector('img:not([src*="icon_vod"])');
    if (!m || !im || seen.has(m[1])) return;
    seen.add(m[1]);
    const box = a.closest('li') || a.parentElement;
    const t = box.querySelector('.common_sp_caption_tit');
    const w = box.querySelector('.common_sp_caption_rv_name');
    out.push({
      id: m[1],
      title: clean(t ? t.textContent : im.alt) || clean(box.textContent).slice(0, 60) || '레시피 ' + m[1],
      by: w ? clean(w.textContent) : '',
      src: abs(im.getAttribute('data-src') || im.getAttribute('src')),
    });
  });
  return out;
}

function parseRecipe(doc) {
  const txt = (s) => { const n = doc.querySelector(s); return n ? clean(n.textContent) : ''; };
  let ld = null;
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try { [].concat(JSON.parse(s.textContent)).forEach((x) => { if (x && x['@type'] === 'Recipe') ld = x; }); } catch (e) { /* ignore */ }
  });
  let ing = [...doc.querySelectorAll('#divConfirmedMaterialArea li')].map((li) => {
    const n = li.querySelector('.ingre_list_name'), a = li.querySelector('.ingre_list_ea');
    return n ? clean(n.textContent + ' ' + (a ? a.textContent : '')) : clean(li.textContent);
  }).filter(Boolean);
  if (!ing.length && ld && ld.recipeIngredient) ing = ld.recipeIngredient.map(clean);
  let steps = [...doc.querySelectorAll('.view_step_cont')].map((s) => {
    const m = s.querySelector('.media-body'), i = s.querySelector('img');
    return { text: clean((m || s).textContent), src: i ? abs(i.getAttribute('src')) : '' };
  }).filter((s) => s.text);
  if (!steps.length && ld && ld.recipeInstructions) {
    steps = [].concat(ld.recipeInstructions).map((s) => ({ text: clean(s.text || s), src: '' }));
  }
  return {
    title: txt('.view2_summary h3') || (ld && ld.name) || '',
    intro: txt('#recipeIntro'),
    meta: ['.view2_summary_info1', '.view2_summary_info2', '.view2_summary_info3'].map(txt).filter(Boolean).join(' · '),
    ing, steps,
  };
}

function card(it, onOpen) {
  const li = el('li', 'rcp-card'), b = el('button');
  b.type = 'button';
  b.append(pic(it.src), el('div', 'rcp-card-t', it.title), el('div', 'rcp-card-b', it.by));
  b.addEventListener('click', onOpen);
  li.append(b);
  return li;
}

// 책처럼 한 쪽씩 넘겨 읽는 전체화면 리더 (새 창 없음). host: 오버레이를 붙일 DOM 노드
function openBook(host, it) {
  const url = `${BASE}/recipe/${it.id}`, key = 'rcp:pos:' + it.id;
  const ov = el('div', 'bk-ov'), book = el('div', 'bk-book'), page = el('div', 'bk-page');
  const prev = el('button', 'bk-nav', '‹'), next = el('button', 'bk-nav', '›'), x = el('button', 'bk-x', '✕');
  const cnt = el('span', 'bk-cnt'), foot = el('div', 'bk-foot');
  [prev, next, x].forEach((b) => { b.type = 'button'; });
  prev.setAttribute('aria-label', '이전 쪽'); next.setAttribute('aria-label', '다음 쪽'); x.setAttribute('aria-label', '닫기');
  foot.append(prev, cnt, next); book.append(page, foot); ov.append(x, book); host.append(ov);
  let pages = [], i = 0, sx = null;
  const close = () => { document.removeEventListener('keydown', onKey); ov.remove(); };
  const show = (n, dir) => {
    if (!pages.length) return;
    i = Math.max(0, Math.min(pages.length - 1, n));
    const leaf = el('div', 'bk-leaf'); leaf.append(pages[i]());
    page.dataset.dir = dir || 0; page.replaceChildren(leaf); page.scrollTop = 0;
    cnt.textContent = `${i + 1} / ${pages.length}`; prev.disabled = i === 0; next.disabled = i === pages.length - 1;
    try { localStorage.setItem(key, String(i)); } catch (e) { /* ignore */ }
  };
  function onKey(e) {
    if (e.key === 'ArrowRight') show(i + 1, 1); else if (e.key === 'ArrowLeft') show(i - 1, -1); else if (e.key === 'Escape') close();
  }
  prev.onclick = () => show(i - 1, -1); next.onclick = () => show(i + 1, 1); x.onclick = close;
  document.addEventListener('keydown', onKey);
  page.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
  page.addEventListener('touchend', (e) => {
    if (sx === null) return;
    const d = e.changedTouches[0].clientX - sx; sx = null;
    if (Math.abs(d) > 50) show(i + (d < 0 ? 1 : -1), d < 0 ? 1 : -1);
  });
  page.replaceChildren(el('p', 'bk-msg', '불러오는 중…'));
  getDoc(url).then((doc) => {
    const r = parseRecipe(doc), title = r.title || it.title;
    pages.push(() => {
      const f = el('div');
      if (it.src) f.append(pic(it.src, 'bk-img'));
      f.append(el('h2', 'bk-h', title), el('p', 'bk-meta', [it.by, r.meta].filter(Boolean).join(' · ')), el('p', 'bk-text', r.intro));
      return f;
    });
    if (r.ing.length) pages.push(() => {
      const f = el('div'), ul = el('ul', 'bk-ing');
      r.ing.forEach((t) => ul.append(el('li', '', t)));
      f.append(el('h3', 'bk-h', '재료'), ul);
      return f;
    });
    r.steps.forEach((s, n) => pages.push(() => {
      const f = el('div');
      f.append(el('div', 'bk-meta', `${n + 1}단계`));
      if (s.src) f.append(pic(s.src, 'bk-img'));
      f.append(el('p', 'bk-text', s.text));
      return f;
    }));
    pages.push(() => {
      const f = el('div'), b = el('button', 'bk-btn', '원문 보기 (앱 안에서)');
      b.type = 'button'; b.onclick = () => API.openWebview(url);
      f.append(el('h3', 'bk-h', '맛있게 드세요'), el('p', 'bk-meta', '출처: 만개의레시피'), b);
      return f;
    });
    let start = 0;
    try { start = parseInt(localStorage.getItem(key), 10) || 0; } catch (e) { /* ignore */ }
    show(start, 0);
  }).catch((e) => page.replaceChildren(el('p', 'bk-msg', errText(e))));
}
const root = document.querySelector('.rcp-root');
if (!root || !API) return;
const $ = (s) => root.querySelector(s);
const CHIPS = [['인기', ''], ['밑반찬', 'cat4=63'], ['메인반찬', 'cat4=56'], ['국/탕', 'cat4=54'], ['찌개', 'cat4=55'],
  ['밥/죽/떡', 'cat4=52'], ['면/만두', 'cat4=53'], ['초스피드', 'cat2=18'], ['도시락', 'cat2=15'], ['야식', 'cat2=45'],
  ['디저트', 'cat4=60'], ['다이어트', 'cat2=21']];
const cur = { params: '', page: 1, label: '지금 인기 있는 레시피' };

async function load(reset) {
  if (reset) { cur.page = 1; $('.rcp-grid').replaceChildren(); }
  $('.rcp-label').textContent = cur.label;
  const status = $('.rcp-status');
  status.textContent = '불러오는 중…';
  const url = cur.params
    ? `${BASE}/recipe/list.html?${cur.params}&page=${cur.page}`
    : `${BASE}/ranking/home_new.html?rtype=r&dtype=d`;
  try {
    const items = parseList(await getDoc(url));
    items.forEach((it) => $('.rcp-grid').append(card(it, () => openBook(root, it))));
    status.textContent = items.length || cur.page > 1 ? '' : '결과가 없습니다. 다른 검색어를 입력해 보세요.';
    $('.rcp-more').hidden = !cur.params || !items.length;
  } catch (e) { status.textContent = errText(e); }
}
const setChip = (idx) => root.querySelectorAll('.rcp-chip').forEach((c, i) => c.classList.toggle('on', i === idx));
CHIPS.forEach(([name, params], idx) => {
  const c = el('button', 'rcp-chip' + (idx === 0 ? ' on' : ''), name);
  c.type = 'button';
  c.addEventListener('click', () => {
    setChip(idx); $('.rcp-q').value = '';
    cur.params = params; cur.label = idx === 0 ? '지금 인기 있는 레시피' : name;
    load(true);
  });
  $('.rcp-chips').append(c);
});
function search() {
  const q = $('.rcp-q').value.trim();
  if (!q) return;
  setChip(-1);
  cur.params = 'q=' + encodeURIComponent(q); cur.label = `“${q}” 검색 결과`;
  load(true);
}
$('.rcp-go').addEventListener('click', search);
$('.rcp-q').addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
$('.rcp-more').addEventListener('click', () => { cur.page += 1; load(false); });
load(true);
})();
