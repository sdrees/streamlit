/**
 * @license
 * Copyright 2018-2020 Streamlit Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

describe("st.error and friends", () => {
  before(() => {
    cy.visit("http://localhost:3000/");
  });

  it("displays correctly", () => {
    cy.get(".element-container .stAlert .markdown-text-container")
      .eq(0)
      .contains("This is an error");
    cy.get(".element-container .stAlert .markdown-text-container")
      .eq(1)
      .contains("This is a warning");
    cy.get(".element-container .stAlert .markdown-text-container")
      .eq(2)
      .contains("This is an info message");
    cy.get(".element-container .stAlert .markdown-text-container")
      .eq(3)
      .contains("This is a success message");
  });

  it("displays correctly", () => {
    cy.get(".main > .block-container").matchImageSnapshot("alerts");
  });
});
