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

from e2e_playwright.conftest import wait_for_app_run


def get_uuids(app: Page):
    expect(app.get_by_test_id("stMarkdown")).to_have_count(2)

    fragment_1_text = app.get_by_test_id("stMarkdown").first.text_content()
    fragment_2_text = app.get_by_test_id("stMarkdown").last.text_content()

    return fragment_1_text, fragment_2_text


def test_fragments_run_independently(app: Page):
    fragment_1_text, fragment_2_text = get_uuids(app)

    # Click the first button and verify that only the uuid in the first fragment
    # changed.
    app.get_by_test_id("stButton").locator("button").first.click()
    wait_for_app_run(app)
    expect(app.get_by_test_id("stMarkdown").first).not_to_have_text(fragment_1_text)
    expect(app.get_by_test_id("stMarkdown").last).to_have_text(fragment_2_text)

    fragment_1_text, fragment_2_text = get_uuids(app)

    # Click the second button and verify that only the uuid in the second fragment
    # changed.
    app.get_by_test_id("stButton").locator("button").last.click()
    wait_for_app_run(app)
    expect(app.get_by_test_id("stMarkdown").first).to_have_text(fragment_1_text)
    expect(app.get_by_test_id("stMarkdown").last).not_to_have_text(fragment_2_text)
