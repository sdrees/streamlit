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

import React, { ReactElement } from "react"

import { useTheme } from "@emotion/react"

import { Button as ButtonProto } from "@streamlit/lib/src/proto"
import BaseButton, {
  BaseButtonKind,
  BaseButtonSize,
  BaseButtonTooltip,
} from "@streamlit/lib/src/components/shared/BaseButton"
import { DynamicIcon } from "@streamlit/lib/src/components/shared/Icon"
import { WidgetStateManager } from "@streamlit/lib/src/WidgetStateManager"
import StreamlitMarkdown from "@streamlit/lib/src/components/shared/StreamlitMarkdown"
import { EmotionTheme } from "@streamlit/lib/src/theme"

export interface Props {
  disabled: boolean
  element: ButtonProto
  widgetMgr: WidgetStateManager
  width: number
  fragmentId?: string
}

function Button(props: Props): ReactElement {
  const { colors }: EmotionTheme = useTheme()
  const { disabled, element, widgetMgr, width, fragmentId } = props
  const style = { width }

  const kind =
    element.type === "primary"
      ? BaseButtonKind.PRIMARY
      : BaseButtonKind.SECONDARY

  // When useContainerWidth true & has help tooltip,
  // we need to pass the container width down to the button
  const fluidWidth = element.help ? width : true

  // Material icons need to be larger to render similar size of emojis, emojis need addtl margin
  const isMaterialIcon = element.icon.startsWith(":material")

  return (
    <div className="stButton" data-testid="stButton" style={style}>
      <BaseButtonTooltip help={element.help}>
        <BaseButton
          kind={kind}
          size={BaseButtonSize.SMALL}
          disabled={disabled}
          fluidWidth={element.useContainerWidth ? fluidWidth : false}
          onClick={() =>
            widgetMgr.setTriggerValue(element, { fromUi: true }, fragmentId)
          }
        >
          {element.icon && (
            <DynamicIcon
              size={isMaterialIcon ? "lg" : "base"}
              margin={isMaterialIcon ? "0 sm 0 0" : "0 md 0 0"}
              color={colors.bodyText}
              iconValue={element.icon}
            />
          )}
          <StreamlitMarkdown
            source={element.label}
            allowHTML={false}
            isLabel
            largerLabel
            disableLinks
          />
        </BaseButton>
      </BaseButtonTooltip>
    </div>
  )
}

export default Button
