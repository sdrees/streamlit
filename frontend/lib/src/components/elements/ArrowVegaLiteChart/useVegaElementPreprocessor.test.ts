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

import { renderHook } from "~lib/components/shared/ElementFullscreen/testUtils"

import { useVegaElementPreprocessor } from "./useVegaElementPreprocessor"
import { VegaLiteChartElement } from "./arrowUtils"

const getElement = (
  elementProps: Partial<VegaLiteChartElement> = {}
): VegaLiteChartElement => ({
  data: null,
  id: "1",
  useContainerWidth: false,
  datasets: [],
  selectionMode: [],
  formId: "",
  spec: JSON.stringify({
    data: {
      values: [
        { category: "A", group: "x", value: 0.1 },
        { category: "A", group: "y", value: 0.6 },
        { category: "A", group: "z", value: 0.9 },
        { category: "B", group: "x", value: 0.7 },
        { category: "B", group: "y", value: 0.2 },
        { category: "B", group: "z", value: 1.1 },
        { category: "C", group: "x", value: 0.6 },
        { category: "C", group: "y", value: 0.1 },
        { category: "C", group: "z", value: 0.2 },
      ],
    },
    mark: "bar",
    encoding: {
      x: { field: "category" },
      y: { field: "value", type: "quantitative" },
    },
  }),
  vegaLiteTheme: "streamlit",
  ...elementProps,
})

describe("useVegaElementPreprocessor", () => {
  it("renders the same selectionMode even if reference changes", () => {
    const { result, rerender } = renderHook(
      (element: VegaLiteChartElement) => useVegaElementPreprocessor(element),
      {
        initialProps: getElement({
          selectionMode: ["single"],
        }),
      }
    )

    const { selectionMode } = result.current

    rerender(
      getElement({
        selectionMode: ["single"],
      })
    )

    expect(result.current.selectionMode).toBe(selectionMode)
  })

  it("renders the same spec even if reference changes", () => {
    const { result, rerender } = renderHook(
      (element: VegaLiteChartElement) => useVegaElementPreprocessor(element),
      {
        initialProps: getElement(),
      }
    )

    const { spec } = result.current

    rerender(getElement())

    expect(result.current.spec).toBe(spec)
  })

  it("updates the spec if factors cause it to change (like sizing, theme, selection mode, and spec)", () => {
    const { result, rerender } = renderHook(
      (element: VegaLiteChartElement) => useVegaElementPreprocessor(element),
      {
        initialProps: getElement(),
      }
    )

    let { spec } = result.current
    const changes: Partial<VegaLiteChartElement>[] = [
      { useContainerWidth: true },
      { vegaLiteTheme: undefined },
      { selectionMode: ["single"] },
      { spec: "{}" },
    ]

    for (const change of changes) {
      rerender(getElement(change))

      expect(result.current.spec).not.toBe(spec)

      // Save the last spec to compare with the next one
      spec = result.current.spec
    }
  })
})
