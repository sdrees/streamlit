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
from typing import Sequence

from parameterized import parameterized

from streamlit.elements.lib.file_uploader_utils import normalize_upload_file_type


class FileUploaderUtilsTest(unittest.TestCase):
    @parameterized.expand(
        [
            ("png", [".png"]),
            (["png", ".svg", "foo"], [".png", ".svg", ".foo"]),
            (["jpeg"], [".jpeg", ".jpg"]),
            (["png", ".jpg"], [".png", ".jpg", ".jpeg"]),
            ([".JpG"], [".jpg", ".jpeg"]),
        ]
    )
    def test_file_type(self, file_type: str | Sequence[str], expected: Sequence[str]):
        """Test that it can be called using string(s) for type parameter."""
        normalized = normalize_upload_file_type(file_type=file_type)
        self.assertEqual(normalized, expected)
