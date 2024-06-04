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

import unittest
from typing import Callable, List, Tuple
from unittest.mock import MagicMock, patch

import pytest
from parameterized import parameterized

import streamlit as st
from streamlit.delta_generator import DeltaGenerator, dg_stack
from streamlit.errors import StreamlitAPIException
from streamlit.runtime.fragment import MemoryFragmentStorage, fragment
from streamlit.runtime.pages_manager import PagesManager
from tests.delta_generator_test_case import DeltaGeneratorTestCase
from tests.streamlit.element_mocks import (
    ELEMENT_PRODUCER,
    NON_WIDGET_ELEMENTS,
    WIDGET_ELEMENTS,
)


class MemoryFragmentStorageTest(unittest.TestCase):
    """Sanity checks for MemoryFragmentStorage.

    These tests may be a bit excessive given that MemoryFragmentStorage is currently
    just a wrapper around a Python dict, but we include them for completeness.
    """

    def setUp(self):
        self._storage = MemoryFragmentStorage()
        self._storage._fragments["some_key"] = "some_fragment"

    def test_get(self):
        assert self._storage.get("some_key") == "some_fragment"

    def test_get_KeyError(self):
        with pytest.raises(KeyError):
            self._storage.get("nonexistent_key")

    def test_set(self):
        self._storage.set("some_key", "new_fragment")
        self._storage.set("some_other_key", "some_other_fragment")

        assert self._storage.get("some_key") == "new_fragment"
        assert self._storage.get("some_other_key") == "some_other_fragment"

    def test_delete(self):
        self._storage.delete("some_key")
        with pytest.raises(KeyError):
            self._storage.get("nonexistent_key")

    def test_del_KeyError(self):
        with pytest.raises(KeyError):
            self._storage.delete("nonexistent_key")

    def test_clear(self):
        self._storage._fragments["some_other_key"] = "some_other_fragment"
        assert len(self._storage._fragments) == 2

        self._storage.clear()
        assert len(self._storage._fragments) == 0


class FragmentTest(unittest.TestCase):
    def setUp(self):
        self.original_dg_stack = dg_stack.get()
        root_container = MagicMock()
        dg_stack.set(
            (
                DeltaGenerator(
                    root_container=root_container,
                    cursor=MagicMock(root_container=root_container),
                ),
            )
        )

    def tearDown(self):
        dg_stack.set(self.original_dg_stack)

    @patch("streamlit.runtime.fragment.get_script_run_ctx", MagicMock())
    def test_wrapped_fragment_calls_original_function(self):
        called = False

        dg_stack_len = len(dg_stack.get())

        @fragment
        def my_fragment():
            nonlocal called
            called = True

            # Verify that a new container gets created for the contents of this
            # fragment to be written to.
            assert len(dg_stack.get()) == dg_stack_len + 1

        my_fragment()
        assert called

    @patch("streamlit.runtime.fragment.get_script_run_ctx")
    def test_resets_current_fragment_id_on_success(self, patched_get_script_run_ctx):
        ctx = MagicMock()
        patched_get_script_run_ctx.return_value = ctx

        @fragment
        def my_fragment():
            pass

        ctx.current_fragment_id = "my_fragment_id"
        my_fragment()
        assert ctx.current_fragment_id is None

    @patch("streamlit.runtime.fragment.get_script_run_ctx")
    def test_resets_current_fragment_id_on_exception(self, patched_get_script_run_ctx):
        ctx = MagicMock()
        patched_get_script_run_ctx.return_value = ctx

        @fragment
        def my_exploding_fragment():
            raise Exception("oh no")

        ctx.current_fragment_id = "my_fragment_id"
        with pytest.raises(Exception):
            my_exploding_fragment()
        assert ctx.current_fragment_id is None

    @patch("streamlit.runtime.fragment.get_script_run_ctx")
    def test_wrapped_fragment_saved_in_FragmentStorage(
        self, patched_get_script_run_ctx
    ):
        ctx = MagicMock()
        patched_get_script_run_ctx.return_value = ctx

        @fragment
        def my_fragment():
            pass

        my_fragment()

        ctx.fragment_storage.set.assert_called_once()

    @patch("streamlit.runtime.fragment.get_script_run_ctx")
    def test_sets_dg_stack_and_cursor_to_snapshots_if_current_fragment_id_set(
        self, patched_get_script_run_ctx
    ):
        ctx = MagicMock()
        ctx.fragment_ids_this_run = {"my_fragment_id"}
        ctx.current_fragment_id = "my_fragment_id"
        ctx.fragment_storage = MemoryFragmentStorage()
        patched_get_script_run_ctx.return_value = ctx

        dg = MagicMock()
        dg.my_random_field = 7
        dg_stack.set((dg,))
        ctx.cursors = MagicMock()
        ctx.cursors.my_other_random_field = 8

        call_count = 0

        @fragment
        def my_fragment():
            nonlocal call_count

            curr_dg_stack = dg_stack.get()
            # Verify that mutations made in previous runs of my_fragment aren't
            # persisted.
            assert curr_dg_stack[0].my_random_field == 7
            assert ctx.cursors.my_other_random_field == 8

            # Attempt to mutate cursors and the dg_stack.
            curr_dg_stack[0].my_random_field += 1
            ctx.cursors.my_other_random_field += 1

            call_count += 1

        my_fragment()

        # Reach inside our MemoryFragmentStorage internals to pull out our saved
        # fragment.
        saved_fragment = list(ctx.fragment_storage._fragments.values())[0]

        # Verify that we can't mutate our dg_stack from within my_fragment. If a
        # mutation is persisted between fragment runs, the assert on `my_random_field`
        # will fail.
        ctx.current_fragment_id = "my_fragment_id"
        saved_fragment()
        ctx.current_fragment_id = "my_fragment_id"
        saved_fragment()

        # Called once when calling my_fragment and three times calling the saved
        # fragment.
        assert call_count == 3

    @patch("streamlit.runtime.fragment.get_script_run_ctx")
    def test_sets_current_fragment_id_if_not_set(self, patched_get_script_run_ctx):
        ctx = MagicMock()
        ctx.fragment_ids_this_run = {}
        ctx.current_fragment_id = None
        ctx.fragment_storage = MemoryFragmentStorage()
        patched_get_script_run_ctx.return_value = ctx

        dg = MagicMock()
        dg.my_random_field = 0
        dg_stack.set((dg,))

        @fragment
        def my_fragment():
            assert ctx.current_fragment_id is not None

            curr_dg_stack = dg_stack.get()
            curr_dg_stack[0].my_random_field += 1

        my_fragment()

        # Reach inside our MemoryFragmentStorage internals to pull out our saved
        # fragment.
        saved_fragment = list(ctx.fragment_storage._fragments.values())[0]
        saved_fragment()
        saved_fragment()

        # This time, dg should have been mutated since we don't restore it from a
        # snapshot in a regular script run.
        assert dg.my_random_field == 3
        assert ctx.current_fragment_id is None

    @parameterized.expand(
        [
            (None, None),
            (3, 3.0),
            (5.0, 5.0),
            ("1 minute", 60.0),
        ]
    )
    @patch("streamlit.runtime.fragment.get_script_run_ctx")
    def test_run_every_arg_handling(
        self,
        run_every,
        expected_interval,
        patched_get_script_run_ctx,
    ):
        called = False

        ctx = MagicMock()
        ctx.fragment_storage = MemoryFragmentStorage()
        patched_get_script_run_ctx.return_value = ctx

        @fragment(run_every=run_every)
        def my_fragment():
            nonlocal called

            called = True

        my_fragment()

        assert called

        if expected_interval is not None:
            [(args, _)] = ctx.enqueue.call_args_list
            msg = args[0]
            assert msg.auto_rerun.interval == expected_interval
            assert (
                isinstance(msg.auto_rerun.fragment_id, str)
                and msg.auto_rerun.fragment_id != ""
            )
        else:
            ctx.enqueue.assert_not_called()

    @patch("streamlit.runtime.fragment.get_script_run_ctx")
    def test_sets_active_script_hash_if_needed(self, patched_get_script_run_ctx):
        ctx = MagicMock()
        ctx.fragment_storage = MemoryFragmentStorage()
        ctx.pages_manager = PagesManager("")
        ctx.pages_manager.set_pages({})  # Migrate to MPAv2
        ctx.pages_manager.set_active_script_hash("some_hash")
        ctx.active_script_hash = ctx.pages_manager.get_active_script_hash()
        patched_get_script_run_ctx.return_value = ctx

        with patch.object(
            ctx.pages_manager, "run_with_active_hash"
        ) as patched_run_with_active_hash:

            @fragment
            def my_fragment():
                pass

            my_fragment()

            # Reach inside our MemoryFragmentStorage internals to pull out our saved
            # fragment.
            saved_fragment = list(ctx.fragment_storage._fragments.values())[0]

            # set the hash to something different for subsequent calls
            ctx.pages_manager.set_active_script_hash("a_different_hash")
            ctx.active_script_hash = ctx.pages_manager.get_active_script_hash()

            # Verify subsequent calls will run with the original active script hash
            saved_fragment()
            patched_run_with_active_hash.assert_called_with("some_hash")
            patched_run_with_active_hash.reset_mock()
            saved_fragment()
            patched_run_with_active_hash.assert_called_with("some_hash")


# TESTS FOR WRITING TO CONTAINERS OUTSIDE AND INSIDE OF FRAGMENT

APP_FUNCTION = Callable[[ELEMENT_PRODUCER], None]


def _run_fragment_writes_to_outside_container_app(
    element_producer: ELEMENT_PRODUCER,
) -> None:
    """App with container outside of fragment."""

    outside_container = st.container()

    @st.experimental_fragment
    def _some_method():
        st.write("Hello")
        # this is forbidden
        with outside_container:
            element_producer()

    _some_method()


def _run_fragment_writes_to_nested_outside_container_app(
    element_producer: ELEMENT_PRODUCER,
) -> None:
    """App with nested container outside of fragment."""
    with st.container():
        outside_container = st.container()

    @st.experimental_fragment
    def _some_method():
        st.write("Hello")
        # this is forbidden
        with outside_container:
            element_producer()

    _some_method()


def _run_fragment_writes_to_nested_outside_container_app2(
    element_producer: ELEMENT_PRODUCER,
) -> None:
    """App with nested container outside of fragment writing from nested container."""
    with st.container():
        outside_container = st.container()

    @st.experimental_fragment
    def _some_method():
        st.write("Hello")
        # this is forbidden
        with outside_container:
            with st.container():
                element_producer()

    _some_method()


def _run_fragment_writes_to_nested_outside_container_app3(
    element_producer: ELEMENT_PRODUCER,
) -> None:
    """App with nested container outside of fragment writing from nested container."""
    with st.container():
        outside_container = st.container()

    @st.experimental_fragment
    def _some_method():
        st.write("Hello")
        with st.container():
            # this is forbidden
            with outside_container:
                element_producer()

    _some_method()


def _run_fragment_writes_to_inside_container_app(
    element_producer: ELEMENT_PRODUCER,
) -> None:
    """App with container inside of fragment."""

    @st.experimental_fragment
    def _some_method():
        inside_container = st.container()

        st.write("Hello")
        with inside_container:
            element_producer()

    _some_method()


def _run_fragment_writes_to_nested_inside_container_app(
    element_producer: ELEMENT_PRODUCER,
) -> None:
    """App with container inside of fragment."""

    @st.experimental_fragment
    def _some_method():
        inside_container = st.container()

        st.write("Hello")
        with st.container():
            with inside_container:
                element_producer()

    _some_method()


outside_container_writing_apps: List[APP_FUNCTION] = [
    _run_fragment_writes_to_outside_container_app,
    _run_fragment_writes_to_nested_outside_container_app,
    _run_fragment_writes_to_nested_outside_container_app2,
    _run_fragment_writes_to_nested_outside_container_app3,
]

inside_container_writing_apps: List[APP_FUNCTION] = [
    _run_fragment_writes_to_inside_container_app,
    _run_fragment_writes_to_nested_inside_container_app,
]

TEST_TUPLE = Tuple[str, APP_FUNCTION, ELEMENT_PRODUCER]


def get_test_tuples(
    app_functions: List[APP_FUNCTION],
    elements: List[Tuple[str, Callable[[], DeltaGenerator]]],
) -> List[TEST_TUPLE]:
    """Create a tuple of (name, app-to-run, element-producer), so that each passed app runs with every passed element.

    Parameters
    ----------
    app_functions : list[APP_FUNCTION]
        Functions that run Streamlit elements like they are an app.
    elements : list[tuple[str, Callable[[], DeltaGenerator]]]
        Tuples of (name, element-producer) where name describes the produced element and element_producer is a function that executes a Streamlit element.
    """
    return [
        (_element_producer[0], _app, _element_producer[1])
        for _app in app_functions
        for _element_producer in elements
    ]


class FragmentCannotWriteToOutsidePathTest(DeltaGeneratorTestCase):
    @parameterized.expand(
        get_test_tuples(outside_container_writing_apps, WIDGET_ELEMENTS)
    )
    def test_write_element_outside_container_raises_exception_for_widgets(
        self,
        _: str,  # the test name argument used by pytest
        _app: Callable[[Callable[[], DeltaGenerator]], None],
        _element_producer: ELEMENT_PRODUCER,
    ):
        with self.assertRaises(StreamlitAPIException) as e:
            _app(_element_producer)
        assert (
            e.exception.args[0]
            == "Fragments cannot write to elements outside of their container."
        )

    @parameterized.expand(
        get_test_tuples(outside_container_writing_apps, NON_WIDGET_ELEMENTS)
    )
    def test_write_element_outside_container_succeeds_for_nonwidgets(
        self,
        _: str,  # the test name argument used by pytest
        _app: Callable[[Callable[[], DeltaGenerator]], None],
        element_producer: ELEMENT_PRODUCER,
    ):
        _app(element_producer)

    @parameterized.expand(
        get_test_tuples(
            inside_container_writing_apps, WIDGET_ELEMENTS + NON_WIDGET_ELEMENTS
        )
    )
    def test_write_elements_inside_container_succeeds_for_all(
        self,
        _: str,  # the test name argument used by pytest
        _app: Callable[[Callable[[], DeltaGenerator]], None],
        element_producer: ELEMENT_PRODUCER,
    ):
        _app(element_producer)
