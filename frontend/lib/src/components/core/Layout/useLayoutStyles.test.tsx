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

import { describe, expect, it } from "vitest"
import { renderHook } from "@testing-library/react-hooks"

import { useLayoutStyles } from "./useLayoutStyles"

describe("#useLayoutStyles", () => {
  describe("when rendering in the top-level container", () => {
    describe("without an element", () => {
      const element = undefined

      it("should return default styles", () => {
        const { result } = renderHook(() =>
          useLayoutStyles({ width: 100, element })
        )
        expect(result.current).toEqual({
          width: 100,
        })
      })
    })
  })

  describe("with an element", () => {
    describe("that has useContainerWidth set to a falsy value", () => {
      const useContainerWidth = false

      it.each([
        [200, { width: 200 }],
        [1000, { width: 700 }],
        [undefined, { width: "auto" }],
        [0, { width: "auto" }],
        [-100, { width: "auto" }],
        [NaN, { width: "auto" }],
      ])("and with a width value of %s, returns %o", (width, expected) => {
        const element = { width, useContainerWidth }
        const { result } = renderHook(() =>
          useLayoutStyles({ width: 700, element })
        )
        expect(result.current).toEqual(expected)
      })
    })

    describe('that has useContainerWidth set to "true"', () => {
      const useContainerWidth = true

      it.each([
        [200, { width: 700 }],
        [1000, { width: 700 }],
        [undefined, { width: 700 }],
        [0, { width: 700 }],
        [-100, { width: 700 }],
        [NaN, { width: 700 }],
      ])("and with a width value of %s, returns %o", (width, expected) => {
        const element = { width, useContainerWidth }
        const { result } = renderHook(() =>
          useLayoutStyles({ width: 700, element })
        )
        expect(result.current).toEqual(expected)
      })
    })
  })
})
