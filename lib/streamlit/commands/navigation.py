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

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Callable, Literal

from typing_extensions import TypeAlias

from streamlit import config
from streamlit.errors import StreamlitAPIException
from streamlit.navigation.page import StreamlitPage
from streamlit.proto.ForwardMsg_pb2 import ForwardMsg
from streamlit.proto.Navigation_pb2 import Navigation as NavigationProto
from streamlit.runtime.metrics_util import gather_metrics
from streamlit.runtime.scriptrunner_utils.script_run_context import (
    ScriptRunContext,
    get_script_run_ctx,
)

if TYPE_CHECKING:
    from streamlit.source_util import PageHash, PageInfo

SectionHeader: TypeAlias = str


def convert_to_streamlit_page(
    page_input: str | Path | Callable[[], None] | StreamlitPage,
) -> StreamlitPage:
    """Convert various input types to StreamlitPage objects."""
    if isinstance(page_input, StreamlitPage):
        return page_input

    if isinstance(page_input, str):
        return StreamlitPage(page_input)

    if isinstance(page_input, Path):
        return StreamlitPage(page_input)

    if callable(page_input):
        # Convert function to StreamlitPage
        return StreamlitPage(page_input)

    raise StreamlitAPIException(
        f"Invalid page type: {type(page_input)}. Must be either a string path, "
        "a pathlib.Path, a callable function, or a st.Page object."
    )


def pages_from_nav_sections(
    nav_sections: dict[SectionHeader, list[StreamlitPage]],
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
    pages: list[str | Path | Callable[[], None] | StreamlitPage]
    | dict[SectionHeader, list[str | Path | Callable[[], None] | StreamlitPage]],
    *,
    position: Literal["sidebar", "hidden"] = "sidebar",
    expanded: bool = False,
) -> StreamlitPage:
    """
    Configure the available pages in a multipage app.

    Call ``st.navigation`` in your entrypoint file to define the structure and navigation
    of your multipage application. The function accepts pages defined as file paths,
    callable functions, or StreamlitPage objects. It returns the current page, which
    can be executed using the ``.run()`` method.

    When using ``st.navigation``, your entrypoint file acts as a router or frame
    containing common elements for all pages. Streamlit executes the entrypoint file
    with every app rerun. To execute the current page, call the ``.run()`` method on
    the ``StreamlitPage`` object returned by ``st.navigation``.

    The set of available pages can be dynamically updated with each rerun.
    By default, the navigation menu appears in the sidebar if there is more than
    one page. This behavior can be modified using the ``position`` parameter.

    Note: When any session of your app executes ``st.navigation``, the app will
    ignore the ``pages/`` directory across all sessions.

    Parameters
    ----------
    pages : Union[List[Union[str, Path, Callable, StreamlitPage]], Dict[str, List[Union[str, Path, Callable, StreamlitPage]]]]
        The available pages for the app. Can be specified in several ways:

        As a list:
        - List of file paths as strings or Path objects (e.g., ["page1.py", Path("page2.py")])
        - List of callable functions (e.g., [page1_func, page2_func])
        - List of StreamlitPage objects (e.g., [st.Page("page1.py"), st.Page(page2_func)])
        - Mixed list of the above types

        As a dictionary for grouped sections:
        - Keys are section labels
        - Values are lists containing any combination of the above types

        Example dictionary:
        {
            "Section 1": ["page1.py", Path("page2.py"), page3_func],
            "Section 2": [st.Page("page3.py")]
        }

    position : Literal["sidebar", "hidden"]
        Controls the navigation menu position:
        - "sidebar" (default): Places the navigation at the top of the sidebar
        - "hidden": Hides the navigation widget
        Note: Navigation is always hidden when there's only one page.

    expanded : bool
        Controls the navigation menu's expansion state:
        - False (default): Menu starts collapsed with a "more" button
        - True: Menu stays permanently expanded
        Note: When changing from True to False, the menu remains expanded
        but displays a collapse button.

    Returns
    -------
    StreamlitPage
        The currently selected page object that can be executed with .run()

    Examples
    --------
    Basic usage with file paths:
    >>> import streamlit as st
    >>> pages = ["home.py", "about.py", "contact.py"]
    >>> page = st.navigation(pages)
    >>> page.run()

    Using functions as pages:
    >>> def home():
    ...     st.title("Home")
    >>> def about():
    ...     st.title("About")
    >>>
    >>> pages = [home, about]
    >>> page = st.navigation(pages)
    >>> page.run()

    Mixed usage with sections:
    >>> pages = {
    ...     "Main": ["home.py", about_func],Page
    ...     "Info": [st.Page("help.py", title="Help Center")],
    ... }
    >>> page = st.navigation(pages)
    >>> page.run()

    Stateful widgets across pages:
    >>> def page1():
    ...     st.write(st.session_state.user_name)
    >>> def page2():
    ...     st.write(st.session_state.user_email)
    >>>
    >>> # Common widgets in entrypoint
    >>> st.text_input("Name", key="user_name")
    >>> st.text_input("Email", key="user_email")
    >>>
    >>> page = st.navigation([page1, page2])
    >>> page.run()

    Using Path objects:
    >>> from pathlib import Path
    >>> pages = [Path("home.py"), Path("about.py")]
    >>> page = st.navigation(pages)
    >>> page.run()

    Mixed usage with Path and sections:
    >>> pages = {
    ...     "Main": [Path("home.py"), about_func],
    ...     "Info": [st.Page(Path("help.py"), title="Help Center")],
    ... }
    >>> page = st.navigation(pages)
    >>> page.run()

    Raises
    ------
    StreamlitAPIException
        In the following cases:
        - No pages provided
        - Multiple pages set as default
        - Duplicate URL pathnames
        - Invalid page type provided

    Notes
    -----
    - File paths can be relative or absolute
    - Function names are used as default page titles
    - URL pathnames must be unique across all pages
    - Only one page can be set as default
    - The first page is automatically set as default if none specified
    - Common widgets should be defined in the entrypoint file for state sharing
    """
    if isinstance(pages, list):
        converted_pages = [convert_to_streamlit_page(p) for p in pages]
        nav_sections = {"": converted_pages}
    else:
        nav_sections = {
            section: [convert_to_streamlit_page(p) for p in section_pages]
            for section, section_pages in pages.items()
        }

    page_list = pages_from_nav_sections(nav_sections)

    if not page_list:
        raise StreamlitAPIException(
            "`st.navigation` must be called with at least one `st.Page`."
        )

    default_page = None
    pagehash_to_pageinfo: dict[PageHash, PageInfo] = {}

    # Get the default page.
    for section_header in nav_sections:
        for page in nav_sections[section_header]:
            if page._default:
                if default_page is not None:
                    raise StreamlitAPIException(
                        "Multiple Pages specified with `default=True`. "
                        "At most one Page can be set to default."
                    )
                default_page = page

    if default_page is None:
        default_page = page_list[0]
        default_page._default = True

    ctx = get_script_run_ctx()
    if not ctx:
        # This should never run in Streamlit, but we want to make sure that
        # the function always returns a page
        default_page._can_be_called = True
        return default_page

    # Build the pagehash-to-pageinfo mapping.
    for section_header in nav_sections:
        for page in nav_sections[section_header]:
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

    msg = ForwardMsg()
    if position == "hidden":
        msg.navigation.position = NavigationProto.Position.HIDDEN
    elif config.get_option("client.showSidebarNavigation") is False:
        msg.navigation.position = NavigationProto.Position.HIDDEN
    else:
        msg.navigation.position = NavigationProto.Position.SIDEBAR

    msg.navigation.expanded = expanded
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
    # Set the current page script hash to the page that is going to be executed
    ctx.set_mpa_v2_page(page_to_return._script_hash)

    # This will either navigation or yield if the page is not found
    ctx.enqueue(msg)

    return page_to_return
