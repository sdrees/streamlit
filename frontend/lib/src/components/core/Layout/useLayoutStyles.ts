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

import { useMemo } from "react"

export type UseLayoutStylesArgs<T> = {
  width: React.CSSProperties["width"] | undefined
  element:
    | (T & { width?: number; useContainerWidth?: boolean | null })
    | undefined
}

const isNonZeroPositiveNumber = (value: unknown): value is number =>
  typeof value === "number" && value > 0 && !isNaN(value)

export type UseLayoutStylesShape = {
  width: React.CSSProperties["width"]
}

/**
 * Returns the contextually-aware style values for an element container
 */
export const useLayoutStyles = <T>({
  width: containerWidth,
  element,
}: UseLayoutStylesArgs<T>): UseLayoutStylesShape => {
  /**
   * The width set from the `st.<command>`
   */
  const commandWidth = element?.width
  const useContainerWidth = element?.useContainerWidth

  // Note: Consider rounding the width to the nearest pixel so we don't have
  // subpixel widths, which leads to blurriness on screen

  const layoutStyles = useMemo((): UseLayoutStylesShape => {
    // If we don't have an element, we are rendering a root-level node, likely a
    // `StyledAppViewBlockContainer`
    if (!element) {
      return {
        width: containerWidth,
      }
    }

    if ("imgs" in element) {
      /**
       * ImageList overrides its `width` param and handles its own width in the
       * component. There should not be any element-specific carve-outs in this
       * file, but given the long-standing behavior of ImageList, we have to
       * make an exception here.
       *
       * @see WidthBehavior on the Backend
       * @see the Image.proto file
       */
      return {
        width: containerWidth,
      }
    }

    let width =
      useContainerWidth && isNonZeroPositiveNumber(containerWidth)
        ? containerWidth
        : commandWidth

    if (width === 0) {
      // An element with no width should be treated as if it has no width set
      // This is likely from the proto, where the default value is 0
      width = undefined
    }

    if (width && width < 0) {
      // If we have an invalid width, we should treat it as if it has no width set
      width = undefined
    }

    if (width !== undefined && isNaN(width)) {
      // If we have an invalid width, we should treat it as if it has no width set
      width = undefined
    }

    if (
      width !== undefined &&
      containerWidth !== undefined &&
      typeof containerWidth === "number" &&
      width > containerWidth
    ) {
      // If the width is greater than the container width, we should use the
      // container width to prevent overflows
      width = containerWidth
    }

    const widthWithFallback = width ?? "auto"

    return {
      width: widthWithFallback,
    }
  }, [useContainerWidth, commandWidth, containerWidth, element])

  return layoutStyles
}
