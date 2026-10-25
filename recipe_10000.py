# -*- coding: utf-8 -*-
from plugins.metadata.base import BaseMetadataProvider


class Recipe10000Provider(BaseMetadataProvider):
    """만개의레시피(10000recipe.com) 풀페이지 뷰어 플러그인.

    데이터는 브라우저(script.js)가 BookOasisPlugin.getProxyUrl()로 직접 가져오므로
    서버 쪽 로직은 없다. 계약상 필수인 search/apply만 형식적으로 구현한다.
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

    def search(self, db_type, query):
        return {'success': True, 'items': []}

    def apply(self, db_type, book_id, item_data):
        return False, "레시피 전용 플러그인입니다."
