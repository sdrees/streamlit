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
import re

import pytest
from playwright.sync_api import Locator, Page, expect

from e2e_playwright.conftest import ImageCompareFunction, wait_until
from e2e_playwright.shared.app_utils import (
    check_top_level_class,
    click_button,
    click_checkbox,
    click_radio_button,
)

VIDEO_ELEMENTS_COUNT = 12


def _select_video_to_show(app: Page, label: str) -> Locator:
    click_radio_button(app, re.compile(f"^{label}$"))
    video_element = app.get_by_test_id("stVideo").first
    # Prevent flakiness: we move the mouse before scrolling to prevent the cursor
    # hovering over a video element and, thereby, changing how the video interface is
    # rendered (e.g. without the controls in the bottom which are hidden)
    app.mouse.move(0, 0)
    video_element.scroll_into_view_if_needed()
    expect(video_element).to_be_visible()
    return video_element


def _wait_until_video_has_data(app: Page, video_element: Locator):
    # To prevent flakiness, we wait for the video to load and start playing
    # The readyState is defined in https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState
    # 3 means there is some data to play now and few frames for the future. On webkit
    # this seems to be flaky, so we check also the duration of the video.
    wait_until(
        app,
        lambda: video_element.evaluate("el => el.readyState >= 3 || el.duration > 0")
        is True,
        timeout=15000,
    )


# Chromium miss codecs required to play that mp3 videos
# https://www.howtogeek.com/202825/what%E2%80%99s-the-difference-between-chromium-and-chrome/
@pytest.mark.skip_browser("chromium")
def test_video_rendering(app: Page, assert_snapshot: ImageCompareFunction):
    """Test that `st.video` renders correctly via screenshots matching."""

    video_element = _select_video_to_show(app, "mp4 video")
    _wait_until_video_has_data(app, video_element)
    assert_snapshot(
        video_element,
        name="video_element_first",
        image_threshold=0.1,
    )

    video_element = _select_video_to_show(app, "mp4 video with subtitles")
    _wait_until_video_has_data(app, video_element)

    assert_snapshot(
        video_element,
        name="video_element_with_subtitles",
        image_threshold=0.1,
    )


@pytest.mark.skip_browser("webkit")
def test_video_rendering_webm(app: Page, assert_snapshot: ImageCompareFunction):
    """Test that `st.video` renders correctly webm video via screenshots matching."""

    video_element = _select_video_to_show(app, "webm video with subtitles")
    _wait_until_video_has_data(app, video_element)

    assert_snapshot(
        video_element,
        name="video_element_webm_with_subtitles",
        image_threshold=0.1,
    )


def test_displays_a_video_player(app: Page):
    video_element = _select_video_to_show(app, "mp4 video")
    # src here is a generated by streamlit url since we pass a file content
    expect(video_element).to_have_attribute("src", re.compile(r".*media.*.mp4"))


@pytest.mark.parametrize(
    "video_option_label",
    [
        pytest.param(
            "webm video with end time", marks=pytest.mark.skip_browser("webkit")
        ),
        pytest.param(
            "mp4 video with end time", marks=pytest.mark.skip_browser("chromium")
        ),
    ],
)
def test_video_end_time(app: Page, video_option_label: str):
    """Test that `st.video` with end_time works correctly."""

    video_element = _select_video_to_show(app, video_option_label)
    _wait_until_video_has_data(app, video_element)
    video_element.evaluate("el => el.play()")
    # Wait until video will reach end_time
    app.wait_for_timeout(3000)
    expect(video_element).to_have_js_property("paused", True)
    wait_until(app, lambda: int(video_element.evaluate("el => el.currentTime")) == 33)


@pytest.mark.parametrize(
    "video_option_label",
    [
        pytest.param(
            "webm video with end time and loop",
            marks=pytest.mark.skip_browser("webkit"),
        ),
        pytest.param(
            "mp4 video with end time and loop",
            marks=pytest.mark.skip_browser("chromium"),
        ),
    ],
)
def test_video_end_time_loop(app: Page, video_option_label: str):
    """Test that `st.video` with end_time and loop works correctly."""
    video_element = _select_video_to_show(app, video_option_label)
    _wait_until_video_has_data(app, video_element)

    video_element.evaluate("el => el.play()")
    # According to the element definition looks like this:
    # start_time=35, end_time=39, loop=True
    # We wait for 6 seconds, which mean the current time should be approximately 37:
    # 4 seconds until end_time and 2 seconds starting from start time
    app.wait_for_timeout(6000)
    expect(video_element).to_have_js_property("paused", False)
    wait_until(app, lambda: 36 < video_element.evaluate("el => el.currentTime") < 38)


@pytest.mark.flaky(reruns=3)  # Some flakiness with the js properties in webkit
def test_video_autoplay(app: Page):
    """Test that `st.video` autoplay property works correctly."""
    video_element = _select_video_to_show(app, "webm video with autoplay")
    expect(video_element).to_have_js_property("paused", True)
    expect(video_element).to_have_js_property("autoplay", False)

    click_checkbox(app, "Autoplay")

    _wait_until_video_has_data(app, video_element)
    expect(video_element).to_have_js_property("autoplay", True)
    expect(video_element).to_have_js_property("paused", False)


def test_video_muted_autoplay(app: Page):
    """Test that `st.video` muted and autoplay properties work correctly."""
    video_element = _select_video_to_show(app, "webm video muted")
    _wait_until_video_has_data(app, video_element)

    expect(video_element).to_have_js_property("muted", True)
    expect(video_element).to_have_js_property("autoplay", True)
    expect(video_element).to_have_js_property("paused", False)


@pytest.mark.flaky(reruns=3)  # Some flakiness with the js properties in webkit
def test_video_remount_no_autoplay(app: Page):
    """Test that `st.video` remounts correctly without autoplay."""
    video_element = _select_video_to_show(app, "webm video with autoplay")
    _wait_until_video_has_data(app, video_element)

    expect(video_element).to_have_js_property("paused", True)
    expect(video_element).to_have_js_property("autoplay", False)

    click_checkbox(app, "Autoplay")

    expect(video_element).to_have_js_property("autoplay", True)
    expect(video_element).to_have_js_property("paused", False)

    click_checkbox(app, "Autoplay")
    click_button(app, "Create some elements to unmount component")

    expect(video_element).to_have_js_property("autoplay", False)
    expect(video_element).to_have_js_property("paused", True)


def test_check_top_level_class(app: Page):
    """Check that the top level class is correctly set."""
    _select_video_to_show(app, "webm video with autoplay")
    check_top_level_class(app, "stVideo")
