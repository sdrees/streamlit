/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
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

import { act, renderHook } from "@testing-library/react-hooks"

import {
  BaseColumn,
  NumberColumn,
  TextColumn,
} from "@streamlit/lib/src/components/widgets/DataFrame/columns"

import useColumnPinning from "./useColumnPinning"

const MOCK_COLUMNS: BaseColumn[] = [
  NumberColumn({
    id: "_column-1",
    name: "column_1",
    title: "Column 1",
    indexNumber: 0,
    arrowType: {
      pandas_type: "int64",
      numpy_type: "int64",
    },
    isEditable: false,
    isHidden: false,
    isIndex: false,
    isPinned: false,
    isStretched: false,
  }),
  TextColumn({
    id: "_column-2",
    name: "column_2",
    title: "Column 2",
    indexNumber: 1,
    arrowType: {
      pandas_type: "unicode",
      numpy_type: "object",
    },
    isEditable: false,
    isHidden: false,
    isIndex: false,
    isPinned: true,
    isStretched: false,
  }),
]

const clearSelectionMock = vi.fn()
const setColumnConfigMappingMock = vi.fn()

describe("useColumnPinning hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns correct initial state", () => {
    const { result } = renderHook(() =>
      useColumnPinning(
        MOCK_COLUMNS,
        false,
        800,
        50,
        clearSelectionMock,
        setColumnConfigMappingMock
      )
    )

    expect(result.current.freezeColumns).toBe(1)
    expect(typeof result.current.pinColumn).toBe("function")
    expect(typeof result.current.unpinColumn).toBe("function")
  })

  it("sets freezeColumns to 0 for empty table", () => {
    const { result } = renderHook(() =>
      useColumnPinning(
        MOCK_COLUMNS,
        true,
        800,
        50,
        clearSelectionMock,
        setColumnConfigMappingMock
      )
    )

    expect(result.current.freezeColumns).toBe(0)
  })

  it("sets freezeColumns to 0 when pinned columns width exceeds limit", () => {
    const { result } = renderHook(() =>
      useColumnPinning(
        MOCK_COLUMNS,
        false,
        100, // Small container width to trigger the width limit
        50,
        clearSelectionMock,
        setColumnConfigMappingMock
      )
    )

    expect(result.current.freezeColumns).toBe(0)
  })

  it("pins column correctly", () => {
    const { result } = renderHook(() =>
      useColumnPinning(
        MOCK_COLUMNS,
        false,
        800,
        50,
        clearSelectionMock,
        setColumnConfigMappingMock
      )
    )

    act(() => {
      result.current.pinColumn("_column-1")
    })

    expect(setColumnConfigMappingMock).toHaveBeenCalled()
    expect(clearSelectionMock).toHaveBeenCalledWith(true, false)

    // Verify the mapping was called with correct parameters
    const setStateCallback = setColumnConfigMappingMock.mock.calls[0][0]
    const prevMap = new Map()
    const newMap = setStateCallback(prevMap)

    expect(newMap.get("_column-1")).toEqual({ pinned: true })
  })

  it("unpins column correctly", () => {
    const { result } = renderHook(() =>
      useColumnPinning(
        MOCK_COLUMNS,
        false,
        800,
        50,
        clearSelectionMock,
        setColumnConfigMappingMock
      )
    )

    act(() => {
      result.current.unpinColumn("_column-2")
    })

    expect(setColumnConfigMappingMock).toHaveBeenCalled()
    expect(clearSelectionMock).toHaveBeenCalledWith(true, false)

    // Verify the mapping was called with correct parameters
    const setStateCallback = setColumnConfigMappingMock.mock.calls[0][0]
    const prevMap = new Map()
    const newMap = setStateCallback(prevMap)

    expect(newMap.get("_column-2")).toEqual({ pinned: false })
  })

  it("preserves existing column config when pinning", () => {
    const { result } = renderHook(() =>
      useColumnPinning(
        MOCK_COLUMNS,
        false,
        800,
        50,
        clearSelectionMock,
        setColumnConfigMappingMock
      )
    )

    act(() => {
      result.current.pinColumn("_column-1")
    })

    // Verify the mapping preserves existing config
    const setStateCallback = setColumnConfigMappingMock.mock.calls[0][0]
    const prevMap = new Map([["_column-1", { width: 100 }]])
    const newMap = setStateCallback(prevMap)

    expect(newMap.get("_column-1")).toEqual({ width: 100, pinned: true })
  })
})
