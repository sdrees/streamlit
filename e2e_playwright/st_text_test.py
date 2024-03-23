# Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
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

from playwright.sync_api import Page, expect

from e2e_playwright.conftest import ImageCompareFunction


def test_st_text_shows_correct_text(app: Page):
    expect(app.get_by_test_id("stText").nth(0)).to_have_text("This text is awesome!")


def test_st_text_shows_ascii_art_correctly(
    app: Page, assert_snapshot: ImageCompareFunction
):
    assert_snapshot(app.get_by_test_id("stText").nth(1), name="st_text-ascii_art")


def test_st_text_doesnt_apply_formatting(
    app: Page, assert_snapshot: ImageCompareFunction
):
    assert_snapshot(
        app.get_by_test_id("stText").nth(2), name="st_text-no_formatting_applied"
    )
