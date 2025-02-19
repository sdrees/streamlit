/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2025)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from "react"

import { screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"

import { PageLink as PageLinkProto } from "@streamlit/protobuf"

import { customRenderLibContext, render } from "~lib/test_util"

import PageLink, { Props } from "./PageLink"

const getProps = (
  elementProps: Partial<PageLinkProto> = {},
  widgetProps: Partial<Props> = {}
): Props => ({
  element: PageLinkProto.create({
    label: "Label",
    page: "streamlit_app",
    pageScriptHash: "main_page_hash",
    useContainerWidth: null,
    ...elementProps,
  }),
  disabled: false,
  ...widgetProps,
})

const mockOnPageChange = vi.fn()

describe("PageLink", () => {
  beforeEach(() => {
    mockOnPageChange.mockClear()
  })

  it("renders without crashing", () => {
    const props = getProps()
    render(<PageLink {...props} />)

    const pageLink = screen.getByRole("link")
    expect(pageLink).toBeInTheDocument()
  })

  it("has correct className", () => {
    const props = getProps()
    render(<PageLink {...props} />)

    const pageLink = screen.getByTestId("stPageLink")

    expect(pageLink).toHaveClass("stPageLink")
  })

  it("renders a label within the button", () => {
    const props = getProps()
    render(<PageLink {...props} />)

    const pageLink = screen.getByRole("link", {
      name: `${props.element.label}`,
    })

    expect(pageLink).toBeInTheDocument()
  })

  it("handles the disabled prop", () => {
    const props = getProps({}, { disabled: true })
    render(<PageLink {...props} />)

    const pageLink = screen.getByRole("link")
    expect(pageLink).toHaveAttribute("disabled")
  })

  it("triggers onPageChange with pageScriptHash when clicked", async () => {
    const user = userEvent.setup()
    const props = getProps()

    customRenderLibContext(<PageLink {...props} />, {
      onPageChange: mockOnPageChange,
    })

    const pageNavLink = screen.getByTestId("stPageLink-NavLink")
    await user.click(pageNavLink)
    expect(mockOnPageChange).toHaveBeenCalledWith("main_page_hash")
  })

  it("does not trigger onPageChange when disabled", async () => {
    const user = userEvent.setup()
    const props = getProps({}, { disabled: true })

    customRenderLibContext(<PageLink {...props} />, {
      onPageChange: mockOnPageChange,
    })

    const pageNavLink = screen.getByTestId("stPageLink-NavLink")
    await user.click(pageNavLink)
    expect(mockOnPageChange).not.toHaveBeenCalled()
  })

  it("does not trigger onPageChange for external links", async () => {
    const user = userEvent.setup()
    const props = getProps({ page: "http://example.com", external: true })

    customRenderLibContext(<PageLink {...props} />, {
      onPageChange: mockOnPageChange,
    })

    const pageNavLink = screen.getByTestId("stPageLink-NavLink")
    await user.click(pageNavLink)
    expect(mockOnPageChange).not.toHaveBeenCalled()
  })
})
