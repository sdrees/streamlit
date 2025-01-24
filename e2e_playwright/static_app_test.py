# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2025)
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import pytest
from playwright.sync_api import Page, expect

from e2e_playwright.conftest import ImageCompareFunction


@pytest.mark.query_param("?staticAppId=Ingest_Public_JSON")
def test_static_app(static_app: Page, assert_snapshot: ImageCompareFunction):
    """Test that a static app can be loaded"""
    main_app_body = static_app.locator(".stMainBlockContainer .stVerticalBlock").first
    app_cells = main_app_body.locator("> div")

    # App always has an empty cell at the beginning (23 displayed cells + 1 empty cell)
    expect(app_cells).to_have_count(24)

    first_cell = app_cells.nth(1)
    assert_snapshot(first_cell, name="example_static_app")
