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


import pandas as pd

import streamlit as st

st.set_page_config(initial_sidebar_state="expanded", layout="wide")


st.header("Custom Themed :primary[App]")


def page1():
    pass


def page2():
    pass


st.navigation(
    [
        st.Page(page1, title="Page 1", icon=":material/home:"),
        st.Page(page2, title="Page 2", icon=":material/settings:"),
    ]
)


col1, col2, col3 = st.columns(3)

with col1:
    st.button("Button")
    st.button("Primary Button", type="primary")
    st.code("# st.code\na = 1234")
    st.chat_input("Chat Input")
with col2:
    with st.expander("Expander", expanded=True):
        st.text_input("Text Input", placeholder="Placeholder")
        st.checkbox("Checkbox", value=True)
        st.slider("Slider", min_value=0, max_value=100, value=50)

with col3:
    tab1, _, _ = st.tabs(["Tab 1", "Tab 2", "Tab 3"])
    with tab1:
        st.dataframe(pd.DataFrame({"A": [1, 2, 3], "B": [4, 5, 6]}))

with st.sidebar:
    st.markdown(
        ":rainbow-background[:rainbow[Hello World]] :material/waving_hand: **This** "
        "`is` [Streamlit](https://streamlit.io).",
        help="Tooltip",
    )
    st.success("Wohooo!")
    st.text_input("Text Input in Sidebar", placeholder="Placeholder")
