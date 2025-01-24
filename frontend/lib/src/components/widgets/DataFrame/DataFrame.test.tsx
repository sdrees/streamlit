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
import * as glideDataGridModule from "@glideapps/glide-data-grid"

import { Arrow as ArrowProto } from "@streamlit/protobuf"

import { TEN_BY_TEN } from "~lib/mocks/arrow"
import { render } from "~lib/test_util"
import { Quiver } from "~lib/dataframes/Quiver"

vi.mock("@glideapps/glide-data-grid", async () => ({
  ...(await vi.importActual("@glideapps/glide-data-grid")),
  DataEditor: vi.fn(props => <div {...props} />),
}))

// The native-file-system-adapter creates some issues in the test environment
// so we mock it out. The errors might be related to the missing typescript
// distribution. But the file picker most likely wouldn't work anyways in jest-dom.
vi.mock("native-file-system-adapter", () => ({}))

import DataFrame, { DataFrameProps } from "./DataFrame"

const getProps = (
  data: Quiver,
  useContainerWidth = false,
  editingMode: ArrowProto.EditingMode = ArrowProto.EditingMode.READ_ONLY
): DataFrameProps => ({
  element: ArrowProto.create({
    data: new Uint8Array(),
    useContainerWidth,
    width: 400,
    height: 400,
    editingMode,
  }),
  data,
  width: 700,
  disabled: false,
  widgetMgr: {
    getStringValue: vi.fn(),
  } as any,
})

const { ResizeObserver } = window

describe("DataFrame widget", () => {
  const props = getProps(new Quiver({ data: TEN_BY_TEN }))

  beforeEach(() => {
    // Mocking ResizeObserver to prevent:
    // TypeError: window.ResizeObserver is not a constructor
    // @ts-expect-error
    delete window.ResizeObserver
    window.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }))
  })

  afterEach(() => {
    window.ResizeObserver = ResizeObserver
    vi.restoreAllMocks()
  })

  it("renders without crashing", () => {
    render(<DataFrame {...props} />)
    expect(screen.getAllByTestId("stDataFrameResizable").length).toBe(1)
  })

  it("should have correct className", () => {
    render(<DataFrame {...props} />)

    const styledResizableContainer = screen.getByTestId("stDataFrame")

    expect(styledResizableContainer).toHaveClass("stDataFrame")
  })

  it("grid container should use full width when useContainerWidth is used", () => {
    render(<DataFrame {...getProps(new Quiver({ data: TEN_BY_TEN }), true)} />)
    const dfStyle = getComputedStyle(
      screen.getByTestId("stDataFrameResizable")
    )
    expect(dfStyle.width).toBe("700px")
    expect(dfStyle.height).toBe("400px")
  })

  it("grid container should render with specific size", () => {
    render(<DataFrame {...props} />)
    const dfStyle = getComputedStyle(
      screen.getByTestId("stDataFrameResizable")
    )
    expect(dfStyle.width).toBe("400px")
    expect(dfStyle.height).toBe("400px")
  })

  it("should have a toolbar", () => {
    render(<DataFrame {...props} />)

    const dataframeToolbar = screen.getByTestId("stElementToolbar")

    expect(dataframeToolbar).toBeInTheDocument()

    const toolbarButtons = screen.getAllByTestId("stElementToolbarButton")
    expect(toolbarButtons).toHaveLength(3)
  })

  it("Touch detection correctly deactivates some features", () => {
    // Set window.matchMedia to simulate a touch device
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
    }))

    render(
      <DataFrame
        {...getProps(
          new Quiver({ data: TEN_BY_TEN }),
          true,
          ArrowProto.EditingMode.FIXED
        )}
      />
    )
    // You have to set a second arg with {} to test work and get the received props
    expect(glideDataGridModule.DataEditor).toHaveBeenCalledWith(
      expect.objectContaining({
        rangeSelect: "cell",
        fillHandle: false,
        onColumnResize: undefined,
      }),
      {}
    )
  })
})
