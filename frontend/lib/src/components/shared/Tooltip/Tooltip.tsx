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

import React, { ReactElement, ReactNode, useRef } from "react"

import { useTheme } from "@emotion/react"
import { ACCESSIBILITY_TYPE, PLACEMENT, StatefulTooltip } from "baseui/tooltip"

import {
  EmotionTheme,
  hasLightBackgroundColor,
} from "@streamlit/lib/src/theme"

import { StyledTooltipContentWrapper } from "./styled-components"

export enum Placement {
  AUTO = "auto",
  TOP_LEFT = "topLeft",
  TOP = "top",
  TOP_RIGHT = "topRight",
  RIGHT_TOP = "rightTop",
  RIGHT = "right",
  RIGHT_BOTTOM = "rightBottom",
  BOTTOM_RIGHT = "bottomRight",
  BOTTOM = "bottom",
  BOTTOM_LEFT = "bottomLeft",
  LEFT_BOTTOM = "leftBottom",
  LEFT = "left",
  LEFT_TOP = "leftTop",
}

export interface TooltipProps {
  content: ReactNode
  placement: Placement
  children: ReactNode
  inline?: boolean
  style?: React.CSSProperties
  onMouseEnterDelay?: number
}

function Tooltip({
  content,
  placement,
  children,
  inline,
  style,
  onMouseEnterDelay,
}: TooltipProps): ReactElement {
  const theme: EmotionTheme = useTheme()
  const { colors, fontSizes, radii, fontWeights } = theme

  const tooltipRef = useRef<HTMLDivElement>(null)

  return (
    <StatefulTooltip
      onOpen={() => {
        const parentElement = tooltipRef.current?.parentElement
        if (!parentElement) {
          return
        }
        // if the tooltip is offscreen to the left, move it to the right by the same amount of pixels
        // use a timeout to that parentElement.getBoundingClientRect returns the correct value; otherwise
        // I have observed it to be "0".
        setTimeout(() => {
          const boundingClientRect = parentElement.getBoundingClientRect()
          const xCoordinate = boundingClientRect.x

          const overflowRight =
            xCoordinate + boundingClientRect.width - window.innerWidth

          // this is the out-of-tree Basweb DOM structure. For the right overflow,
          // this is the element that has the transform-style property set that needs
          // to be modified.
          const parentsParentElement = parentElement.parentElement

          if (overflowRight > 0 && parentsParentElement) {
            // Baseweb uses a transform to position the tooltip, so we need to adjust the transform instead
            // of the left / right property, otherwise it looks weird when the tooltip overflows the right side
            const transformStyleMatrix = new DOMMatrix(
              window.getComputedStyle(parentsParentElement)?.transform
            )
            parentsParentElement.style.transform = `translate3d(${
              transformStyleMatrix.e - overflowRight
            }px, ${transformStyleMatrix.f}px, 0px)`
          }

          if (xCoordinate < 0) {
            parentElement.style.left = `${-xCoordinate}px`
          }
        }, 0)
      }}
      content={
        content ? (
          <StyledTooltipContentWrapper
            className="stTooltipContent"
            data-testid="stTooltipContent"
            ref={tooltipRef}
          >
            {content}
          </StyledTooltipContentWrapper>
        ) : null
      }
      placement={PLACEMENT[placement]}
      accessibilityType={ACCESSIBILITY_TYPE.tooltip}
      showArrow={false}
      popoverMargin={10}
      onMouseEnterDelay={onMouseEnterDelay}
      overrides={{
        Body: {
          style: {
            // This is annoying, but a bunch of warnings get logged when the
            // shorthand version `borderRadius` is used here since the long
            // names are used by BaseWeb and mixing the two is apparently
            // bad :(
            borderTopLeftRadius: radii.default,
            borderTopRightRadius: radii.default,
            borderBottomLeftRadius: radii.default,
            borderBottomRightRadius: radii.default,

            paddingTop: "0 !important",
            paddingBottom: "0 !important",
            paddingLeft: "0 !important",
            paddingRight: "0 !important",

            backgroundColor: "transparent",
          },
        },
        Inner: {
          style: {
            backgroundColor: hasLightBackgroundColor(theme)
              ? colors.bgColor
              : colors.secondaryBg,
            color: colors.bodyText,
            fontSize: fontSizes.sm,
            fontWeight: fontWeights.normal,

            // See the long comment about `borderRadius`. The same applies here
            // to `padding`.
            paddingTop: "0 !important",
            paddingBottom: "0 !important",
            paddingLeft: "0 !important",
            paddingRight: "0 !important",
          },
        },
      }}
    >
      {/* BaseWeb manipulates its child, so we create a wrapper div for protection */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: inline ? "flex-end" : "",
          ...style,
        }}
        data-testid="stTooltipHoverTarget"
        className="stTooltipHoverTarget"
      >
        {children}
      </div>
    </StatefulTooltip>
  )
}

export default Tooltip
