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

import { act, renderHook } from "@testing-library/react-hooks"

import {
  BaseColumn,
  NumberColumn,
  TextColumn,
} from "@streamlit/lib/src/components/widgets/DataFrame/columns"

import useColumnReordering from "./useColumnReordering"

const MOCK_COLUMNS: BaseColumn[] = [
  NumberColumn({
    id: "column_1",
    name: "column_1",
    title: "column_1",
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
    id: "column_2",
    name: "column_2",
    title: "column_2",
    indexNumber: 1,
    arrowType: {
      pandas_type: "unicode",
      numpy_type: "object",
    },
    isEditable: false,
    isHidden: false,
    isIndex: false,
    isPinned: false,
    isStretched: false,
  }),
]

const pinColumnMock = vi.fn()
const unpinColumnMock = vi.fn()
const setColumnOrderMock = vi.fn()

describe("useColumnReordering hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns onColumnMoved callback", () => {
    const { result } = renderHook(() =>
      useColumnReordering(
        MOCK_COLUMNS,
        0,
        pinColumnMock,
        unpinColumnMock,
        setColumnOrderMock
      )
    )

    expect(typeof result.current.onColumnMoved).toBe("function")
  })

  it("correctly handles moving a column to a new position", () => {
    const { result } = renderHook(() =>
      useColumnReordering(
        MOCK_COLUMNS,
        0,
        pinColumnMock,
        unpinColumnMock,
        setColumnOrderMock
      )
    )

    act(() => {
      result.current.onColumnMoved?.(0, 1)
    })

    expect(setColumnOrderMock).toHaveBeenCalledWith(["column_2", "column_1"])
  })

  it("pins column when moved to frozen section", () => {
    const { result } = renderHook(() =>
      useColumnReordering(
        MOCK_COLUMNS,
        1,
        pinColumnMock,
        unpinColumnMock,
        setColumnOrderMock
      )
    )

    act(() => {
      result.current.onColumnMoved?.(1, 0)
    })

    expect(pinColumnMock).toHaveBeenCalledWith("column_2")
    expect(setColumnOrderMock).toHaveBeenCalledWith(["column_2", "column_1"])
  })

  it("unpins column when moved out of frozen section", () => {
    const pinnedColumns = [
      {
        ...MOCK_COLUMNS[0],
        isPinned: true,
      },
      MOCK_COLUMNS[1],
    ]

    const { result } = renderHook(() =>
      useColumnReordering(
        pinnedColumns,
        1,
        pinColumnMock,
        unpinColumnMock,
        setColumnOrderMock
      )
    )

    act(() => {
      result.current.onColumnMoved?.(0, 1)
    })

    expect(unpinColumnMock).toHaveBeenCalledWith("column_1")
    expect(setColumnOrderMock).toHaveBeenCalledWith(["column_2", "column_1"])
  })
})
