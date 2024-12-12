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

from typing import TYPE_CHECKING, Tuple, Union

from typing_extensions import assert_type

# Perform some "type checking testing"; mypy should flag any assignments that are incorrect.
if TYPE_CHECKING:
    from datetime import date, timedelta

    from streamlit.elements.widgets.time_widgets import TimeWidgetsMixin

    today: date = date.today()
    past: date = today - timedelta(days=30)

    date_input = TimeWidgetsMixin().date_input

    # Check single value
    assert_type(
        date_input("foo", value=today),
        Union[date, Tuple[()], Tuple[date], Tuple[date, date], None],
    )

    # Check single None
    assert_type(
        date_input("bar", value=None),
        Union[date, Tuple[()], Tuple[date], Tuple[date, date], None],
    )

    # Check not passing value (default is "today" string)
    assert_type(
        date_input("buz"),
        Union[date, Tuple[()], Tuple[date], Tuple[date, date], None],
    )

    # Check range value
    assert_type(
        date_input("foobar", value=(past, today)),
        Union[date, Tuple[()], Tuple[date], Tuple[date, date], None],
    )
