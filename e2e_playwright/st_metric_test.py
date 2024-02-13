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


def test_first_metric_in_first_row(app: Page):
    expect(app.get_by_test_id("stMetricLabel").nth(0)).to_have_text("User growth")
    expect(app.get_by_test_id("stMetricValue").nth(0)).to_have_text(" 123 ")
    expect(app.get_by_test_id("stMetricDelta").nth(0)).to_have_text(" 123 ")


def test_second_metric_in_first_row(app: Page):
    expect(app.get_by_test_id("stMetricLabel").nth(2)).to_have_text("S&P 500")
    expect(app.get_by_test_id("stMetricValue").nth(2)).to_have_text(" -4.56 ")
    expect(app.get_by_test_id("stMetricDelta").nth(2)).to_have_text(" -50 ")


def test_third_metric_in_first_row(app: Page):
    expect(app.get_by_test_id("stMetricLabel").nth(4)).to_have_text("Apples I've eaten")
    expect(app.get_by_test_id("stMetricValue").nth(4)).to_have_text(" 23k ")
    expect(app.get_by_test_id("stMetricDelta").nth(4)).to_have_text(" -20 ")


def test_green_up_arrow_render(themed_app: Page, assert_snapshot: ImageCompareFunction):
    assert_snapshot(
        themed_app.get_by_test_id("stMetric").nth(0),
        name="st_metric-green",
    )


def test_red_down_arrow_render(themed_app: Page, assert_snapshot: ImageCompareFunction):
    assert_snapshot(
        themed_app.get_by_test_id("stMetric").nth(2),
        name="st_metric-red",
    )


def test_gray_down_arrow_render(
    themed_app: Page, assert_snapshot: ImageCompareFunction
):
    assert_snapshot(
        themed_app.get_by_test_id("stMetric").nth(4),
        name="st_metric-gray",
    )


def test_help_shows_up_without_columns(
    themed_app: Page, assert_snapshot: ImageCompareFunction
):
    assert_snapshot(
        themed_app.get_by_test_id("stMetric").nth(6),
        name="st_metric-with_help",
    )


def test_none_results_in_dash_in_value(
    themed_app: Page, assert_snapshot: ImageCompareFunction
):
    assert_snapshot(
        themed_app.get_by_test_id("stMetric").nth(7),
        name="st_metric-with_none_value",
    )


def test_label_visibility_set_to_hidden(
    themed_app: Page, assert_snapshot: ImageCompareFunction
):
    expect(themed_app.get_by_test_id("stMetricLabel").nth(3)).to_have_text("Test 4")
    assert_snapshot(
        themed_app.get_by_test_id("stMetric").nth(3),
        name="st_metric-label_hidden",
    )


def test_label_visibility_set_to_collapse(
    themed_app: Page, assert_snapshot: ImageCompareFunction
):
    expect(themed_app.get_by_test_id("stMetricLabel").nth(5)).to_have_text("Test 5")
    assert_snapshot(
        themed_app.get_by_test_id("stMetric").nth(5),
        name="st_metric-label_collapse",
    )


def test_ellipses_and_help_shows_up_properly(
    themed_app: Page, assert_snapshot: ImageCompareFunction
):
    assert_snapshot(
        themed_app.get_by_test_id("stMetric").nth(8),
        name="st_metric-help_and_ellipses",
    )
