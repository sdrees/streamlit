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

import pathlib

import streamlit as st
from tests.delta_generator_test_case import DeltaGeneratorTestCase


class StHtmlAPITest(DeltaGeneratorTestCase):
    """Test st.html API."""

    def test_st_html(self):
        """Test st.html."""
        st.html("<i> This is a i tag </i>")

        el = self.get_delta_from_queue().new_element
        self.assertEqual(el.html.body, "<i> This is a i tag </i>")

    def test_st_html_with_file(self):
        """Test st.html with file."""
        st.html(str(pathlib.Path(__file__).parent / "test_html.js"))

        el = self.get_delta_from_queue().new_element
        self.assertEqual(el.html.body, "<button>Corgi</button>")

    def test_st_html_with_path(self):
        """Test st.html with path."""
        st.html(pathlib.Path(__file__).parent / "test_html.js")

        el = self.get_delta_from_queue().new_element
        self.assertEqual(el.html.body, "<button>Corgi</button>")

    def test_st_html_with_dunderstr(self):
        """Test st.html with __str__."""

        class MyClass:
            def __str__(self):
                return "mystr"

        obj = MyClass()

        st.html(obj)

        el = self.get_delta_from_queue().new_element
        self.assertEqual(el.html.body, "mystr")

    def test_st_html_with_repr_html(self):
        """Test st.html with _repr_html_."""

        class MyClass:
            def _repr_html_(self):
                return "<div>html</div>"

        obj = MyClass()

        st.html(obj)

        el = self.get_delta_from_queue().new_element
        self.assertEqual(el.html.body, "<div>html</div>")

    def test_st_html_with_repr_html_and_dunderstr(self):
        """Test st.html with _repr_html_ and dunderstr: html should win."""

        class MyClass:
            def __str__(self):
                return "mystr"

            def _repr_html_(self):
                return "<div>html</div>"

        obj = MyClass()

        st.html(obj)

        el = self.get_delta_from_queue().new_element
        self.assertEqual(el.html.body, "<div>html</div>")

    def test_st_html_with_nonhtml_filelike_str(self):
        """Test st.html with a string that's neither HTML-like nor a real file."""
        st.html("foo/fake.html")

        el = self.get_delta_from_queue().new_element
        self.assertEqual(el.html.body, "foo/fake.html")
