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

import { DownloadButton as DownloadButtonProto } from "@streamlit/protobuf"

import { render } from "~lib/test_util"
import { WidgetStateManager } from "~lib/WidgetStateManager"
import { mockEndpoints } from "~lib/mocks/mocks"

import DownloadButton, { createDownloadLink, Props } from "./DownloadButton"

vi.mock("~lib/WidgetStateManager")
vi.mock("~lib/StreamlitEndpoints")

const getProps = (
  elementProps: Partial<DownloadButtonProto> = {},
  widgetProps: Partial<Props> = {}
): Props => ({
  element: DownloadButtonProto.create({
    id: "1",
    label: "Label",
    url: "/media/mockDownloadURL",
    ...elementProps,
  }),
  disabled: false,
  widgetMgr: new WidgetStateManager({
    sendRerunBackMsg: vi.fn(),
    formsDataChanged: vi.fn(),
  }),
  endpoints: mockEndpoints(),
  ...widgetProps,
})

describe("DownloadButton widget", () => {
  it("renders without crashing", () => {
    const props = getProps()
    render(<DownloadButton {...props} />)

    const downloadButton = screen.getByRole("button")
    expect(downloadButton).toBeInTheDocument()
  })

  it("has correct className", () => {
    const props = getProps()
    render(<DownloadButton {...props} />)

    const downloadButton = screen.getByTestId("stDownloadButton")

    expect(downloadButton).toHaveClass("stDownloadButton")
  })

  it("renders a label within the button", () => {
    const props = getProps()
    render(<DownloadButton {...props} />)

    const downloadButton = screen.getByRole("button", {
      name: `${props.element.label}`,
    })

    expect(downloadButton).toBeInTheDocument()
  })

  describe("wrapped BaseButton", () => {
    it("sets widget triggerValue and creates a download URL on click", async () => {
      const user = userEvent.setup()
      const props = getProps()
      render(<DownloadButton {...props} />)

      const downloadButton = screen.getByRole("button")
      await user.click(downloadButton)

      expect(props.widgetMgr.setTriggerValue).toHaveBeenCalledWith(
        props.element,
        { fromUi: true },
        undefined
      )

      expect(props.endpoints.buildMediaURL).toHaveBeenCalledWith(
        "/media/mockDownloadURL"
      )
    })

    it("has a correct new tab behaviour download link", () => {
      const props = getProps()
      const sameTabLink = createDownloadLink(
        props.endpoints,
        props.element.url,
        false
      )
      expect(sameTabLink.getAttribute("target")).toBe("_self")

      const newTabLink = createDownloadLink(
        props.endpoints,
        props.element.url,
        true
      )
      expect(newTabLink.getAttribute("target")).toBe("_blank")
    })

    it("can set fragmentId on click", async () => {
      const user = userEvent.setup()
      const props = getProps(undefined, { fragmentId: "myFragmentId" })
      render(<DownloadButton {...props} />)

      const downloadButton = screen.getByRole("button")
      await user.click(downloadButton)

      expect(props.widgetMgr.setTriggerValue).toHaveBeenCalledWith(
        props.element,
        { fromUi: true },
        "myFragmentId"
      )
    })

    it("handles the disabled prop", () => {
      const props = getProps({}, { disabled: true })
      render(<DownloadButton {...props} />)

      const downloadButton = screen.getByRole("button")
      expect(downloadButton).toBeDisabled()
    })
  })
})
