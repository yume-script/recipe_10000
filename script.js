(function () {
  const BASE = 'https://www.10000recipe.com';
  const root = document.querySelector('.rcp-root');
  const API = window.BookOasisPlugin;
  if (!root || !API) return;
  const $ = (s) => root.querySelector(s);
  const CHIPS = [['인기', ''], ['밑반찬', 'cat4=63'], ['메인반찬', 'cat4=56'], ['국/탕', 'cat4=54'], ['찌개', 'cat4=55'],
    ['밥/죽/떡', 'cat4=52'], ['면/만두', 'cat4=53'], ['초스피드', 'cat2=18'], ['도시락', 'cat2=15'], ['야식', 'cat2=45'],
    ['디저트', 'cat4=60'], ['다이어트', 'cat2=21']];
  const cur = { params: '', page: 1, label: '' };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
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
  function pic(src) {
    const i = document.createElement('img');
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

  function card(it) {
    const li = el('li', 'rcp-card'), b = el('button');
    b.type = 'button';
    b.append(pic(it.src), el('div', 'rcp-card-t', it.title), el('div', 'rcp-card-b', it.by));
    b.addEventListener('click', () => openDetail(it));
    li.append(b);
    $('.rcp-grid').append(li);
  }

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
      items.forEach(card);
      status.textContent = items.length || cur.page > 1 ? '' : '결과가 없습니다. 다른 검색어를 입력해 보세요.';
      $('.rcp-more').hidden = !cur.params || !items.length;
    } catch (e) { status.textContent = errText(e); }
  }

  async function openDetail(it) {
    const modal = $('.rcp-modal'), sheet = $('.rcp-sheet');
    const url = `${BASE}/recipe/${it.id}`;
    sheet.replaceChildren(el('p', 'rcp-status', '불러오는 중…'));
    modal.hidden = false;
    try {
      const r = parseRecipe(await getDoc(url));
      const close = el('button', 'rcp-btn ghost', '닫기');
      close.type = 'button';
      close.addEventListener('click', () => { modal.hidden = true; });
      const open = el('a', 'rcp-btn', '원문 열기');
      open.href = url; open.target = '_blank'; open.rel = 'noopener';
      const inApp = el('button', 'rcp-btn ghost', '앱 안에서 보기');
      inApp.type = 'button';
      inApp.addEventListener('click', () => API.openWebview(url));
      const ol = el('ol', 'rcp-steps');
      r.steps.forEach((s) => { const li = el('li', '', s.text); if (s.src) li.append(pic(s.src)); ol.append(li); });
      const ul = el('ul', 'rcp-ing');
      r.ing.forEach((t) => ul.append(el('li', '', t)));
      sheet.replaceChildren(el('h3', '', r.title || it.title), el('div', 'rcp-meta', r.meta), el('p', '', r.intro));
      if (r.ing.length) sheet.append(el('h4', '', '재료'), ul);
      if (r.steps.length) sheet.append(el('h4', '', '만드는 순서'), ol);
      else sheet.append(el('p', 'rcp-status', '순서를 읽지 못했습니다. 원문 열기를 이용해 주세요.'));
      const act = el('div', 'rcp-actions');
      act.append(open, inApp, close);
      sheet.append(act);
    } catch (e) { sheet.replaceChildren(el('p', 'rcp-status', errText(e))); }
  }

  function setChip(idx) {
    root.querySelectorAll('.rcp-chip').forEach((c, i) => c.classList.toggle('on', i === idx));
  }
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
  $('.rcp-modal').addEventListener('click', (e) => { if (e.target === e.currentTarget) e.currentTarget.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('.rcp-modal').hidden = true; });

  cur.label = '지금 인기 있는 레시피';
  load(true);
})();
