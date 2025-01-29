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

# TODO: Change this to a stable location and eventually make it configurable
# Holds url for static asset location
STATIC_ASSET_CONFIG = "https://s3.us-west-2.amazonaws.com/notebooks.streamlit.io"


@pytest.mark.query_param("?staticAppId=Ingest_Public_JSON")
def test_static_app(static_app: Page, assert_snapshot: ImageCompareFunction):
    """Test that a static app can be loaded"""
    # Explicit setting of viewport to resolve snapshot size flakiness
    static_app.set_viewport_size({"width": 1280, "height": 720})
    static_app.wait_for_function("() => window.innerWidth === 1280")

    main_app_body = static_app.locator(".stMainBlockContainer .stVerticalBlock").first
    app_cells = main_app_body.locator("> div")

    # App always has an empty cell at the beginning (23 displayed cells + 1 empty cell)
    expect(app_cells).to_have_count(24)

    first_cell = app_cells.nth(1)
    assert_snapshot(first_cell, name="example_static_app")


@pytest.mark.query_param("?staticAppId=Visual_Data_Stories_with_Snowflake_Notebooks")
def test_static_app_media(static_app: Page):
    """Test that static app media is sourced properly"""
    main_app_body = static_app.locator(".stMainBlockContainer .stVerticalBlock").first
    app_cells = main_app_body.locator("> div")

    # App always has an empty cell at the beginning (34 displayed cells + 1 empty cell)
    expect(app_cells).to_have_count(35)

    image_cell = app_cells.nth(29)
    image = image_cell.locator("img")

    expect(image).to_have_attribute(
        "src",
        f"{STATIC_ASSET_CONFIG}/Visual_Data_Stories_with_Snowflake_Notebooks/media/3954fdb11794f07e22076cd644b22d4931ba829c9474cd7c3126362e.png",
    )
