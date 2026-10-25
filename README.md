# 만개의레시피 플러그인 (recipe_10000)

사이드바에 "만개의레시피" 메뉴를 추가합니다. 인기 랭킹, 카테고리 칩, 검색, 레시피 상세(재료/순서)를 앱 안에서 봅니다.

## 설치
1. 이 폴더를 `plugins/metadata/recipe_10000/` 로 복사하고 서버를 재시작합니다.
2. 환경설정 > 플러그인 설정에서 활성화합니다.
3. 환경설정 > 외부 도메인에 `www.10000recipe.com` 을 등록합니다 (미등록 시 화면에 안내가 뜹니다).

## 동작 방식
- 서버 코드는 없습니다. 브라우저가 `BookOasisPlugin.getProxyUrl()` 로 페이지를 받아 `DOMParser` 로 읽습니다.
- 이미지는 `getCachedImageUrl()` 로 로컬 캐시되어 표시됩니다.
- 사이트 HTML 구조가 바뀌면 `script.js` 의 `parseList()` / `parseRecipe()` 선택자만 고치면 됩니다.
