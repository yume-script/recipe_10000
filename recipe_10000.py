# -*- coding: utf-8 -*-
from plugins.metadata.base import BaseMetadataProvider


class Recipe10000Provider(BaseMetadataProvider):
    """만개의레시피(10000recipe.com) 플러그인.

    - category_tab: 사이드바 풀페이지(검색/카테고리/랭킹) + 책처럼 넘겨 읽는 리더
    - home_widget: 홈 화면 "오늘의 인기 레시피" (배치 모드에서 직접 추가)
    데이터는 브라우저가 BookOasisPlugin.getProxyUrl()로 가져오므로 서버 로직은 없다.
    """
    id = "recipe_10000"
    name = "만개의레시피"
    is_searchable = False
    config_schema = []

    category_tab = {
        "title": "만개의레시피",
        "icon": "fa-solid fa-utensils",
        "order": 85,
        "sessions": ["general"],
    }

    home_widget = {
        "title": "오늘의 인기 레시피",
        "subtitle": "만개의레시피",
        "icon": "fa-solid fa-utensils",
        "order": 60,
        "sessions": ["general"],
        "layout": "grid",
        "size": 2,
    }

    def search(self, db_type, query):
        return {'success': True, 'items': []}

    def apply(self, db_type, book_id, item_data):
        return False, "레시피 전용 플러그인입니다."

    def get_dashboard_data(self, db_type, limit=10):
        # 실제 표시는 dashboard.js가 한다. items가 비면 위젯이 숨겨질 수 있어 자리표시 1건만 반환.
        return {'success': True, 'items': [
            {'item_type': 'metric', 'metric': '레시피', 'value': '만개의레시피'}
        ]}
