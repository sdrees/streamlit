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

from __future__ import annotations

from pathlib import Path
from typing import Literal

from typing_extensions import TypeAlias

from streamlit.errors import StreamlitAPIException
from streamlit.navigation.page import StreamlitPage
from streamlit.proto.ForwardMsg_pb2 import ForwardMsg
from streamlit.proto.Navigation_pb2 import Navigation as NavigationProto
from streamlit.runtime.metrics_util import gather_metrics
from streamlit.runtime.scriptrunner.script_run_context import (
    ScriptRunContext,
    get_script_run_ctx,
)
from streamlit.source_util import PageHash, PageInfo

SectionHeader: TypeAlias = str


def pages_from_nav_sections(
    nav_sections: dict[SectionHeader, list[StreamlitPage]]
) -> list[StreamlitPage]:
    page_list = []
    for pages in nav_sections.values():
        for page in pages:
            page_list.append(page)

    return page_list


def send_page_not_found(ctx: ScriptRunContext):
    msg = ForwardMsg()
    msg.page_not_found.page_name = ""
    ctx.enqueue(msg)


@gather_metrics("navigation")
def navigation(
    pages: list[StreamlitPage] | dict[SectionHeader, list[StreamlitPage]],
    *,
    position: Literal["sidebar", "hidden"] = "sidebar",
) -> StreamlitPage:
    """
    Configure the available pages in a multipage app.

    Call `st.navigation` in your main script with one or more pages defined by
    `st.Page`. `st.navigation` returns the current page which can be executed
    using `Page.run()`.

    When using `st.navigation`, the main script is executed on every app rerun,
    with the current page executed in-line using `Page.run()`. The set of
    available pages can be updated with each rerun for dynamic navigation. In
    this mode, the `pages/` folder is ignored.

    By default, `st.navigation` draws the available pages in the side
    navigation. This behavior can be changed using the `position=` keyword
    argument.

    Parameters
    ----------
    pages: list[st.Page] or dict[str, list[st.Page]]
        A list of `st.Page` objects or a dictionary where the keys are section
        headers and the values are lists of `st.Page` objects.

    position: "sidebar" or "hidden"
        The position of the navigation menu. Can be "sidebar" or "hidden".

    Example
    -------
    >>> import streamlit as st
    >>> from pages import page1, page2
    >>>
    >>>	pg = st.navigation([st.Page(page1), st.Page(page2)])
    >>>
    >>>	st.title("My Awesome App")
    >>> pg.run()
    """
    nav_sections = {"": pages} if isinstance(pages, list) else pages
    page_list = pages_from_nav_sections(nav_sections)

    if not page_list:
        raise StreamlitAPIException(
            "`st.navigation` must be called with at least one `st.Page`."
        )

    default_page = None
    pagehash_to_pageinfo: dict[PageHash, PageInfo] = {}

    # This nested loop keeps track of two things:
    # 1. the default page
    # 2. the pagehash to pageinfo mapping
    for section_header in nav_sections:
        for page in nav_sections[section_header]:
            if page._default:
                if default_page is not None:
                    raise StreamlitAPIException(
                        "Multiple Pages specified with `default=True`. "
                        "At most one Page can be set to default."
                    )
                default_page = page

            if isinstance(page._page, Path):
                script_path = str(page._page)
            else:
                script_path = ""

            script_hash = page._script_hash
            if script_hash in pagehash_to_pageinfo:
                # The page script hash is soley based on the url path
                # So duplicate page script hashes are due to duplicate url paths
                raise StreamlitAPIException(
                    f"Multiple Pages specified with URL pathname {page.url_path}. "
                    "URL pathnames must be unique. The url pathname may be "
                    "inferred from the filename, callable name, or title."
                )

            pagehash_to_pageinfo[script_hash] = {
                "page_script_hash": script_hash,
                "page_name": page.title,
                "icon": page.icon,
                "script_path": script_path,
                "url_pathname": page.url_path,
            }

    if default_page is None:
        default_page = page_list[0]
        default_page._default = True

    msg = ForwardMsg()
    if position == "hidden":
        msg.navigation.position = NavigationProto.Position.HIDDEN
    else:
        msg.navigation.position = NavigationProto.Position.SIDEBAR
    msg.navigation.sections[:] = nav_sections.keys()
    for section_header in nav_sections:
        for page in nav_sections[section_header]:
            p = msg.navigation.app_pages.add()
            p.page_script_hash = page._script_hash
            p.page_name = page.title
            p.icon = page.icon
            p.is_default = page._default
            p.section_header = section_header
            p.url_pathname = page.url_path

    ctx = get_script_run_ctx()
    if not ctx:
        # This should never run in Streamlit, but we want to make sure that
        # the function always returns a page
        default_page._can_be_called = True
        return default_page

    # Inform our page manager about the set of pages we have
    ctx.pages_manager.set_pages(pagehash_to_pageinfo)
    found_page = ctx.pages_manager.get_page_script(
        fallback_page_hash=default_page._script_hash
    )

    page_to_return = None
    if found_page:
        found_page_script_hash = found_page["page_script_hash"]
        matching_pages = [
            p for p in page_list if p._script_hash == found_page_script_hash
        ]
        if len(matching_pages) > 0:
            page_to_return = matching_pages[0]

    if not page_to_return:
        send_page_not_found(ctx)
        page_to_return = default_page

    # Ordain the page that can be called
    page_to_return._can_be_called = True
    msg.navigation.page_script_hash = page_to_return._script_hash

    # This will either navigation or yield if the page is not found
    ctx.enqueue(msg)

    return page_to_return
