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

import {
  BaseButton,
  BaseButtonKind,
  IGuestToHostMessage,
  IToolbarItem,
} from "@streamlit/lib"
import { SegmentMetricsManager } from "@streamlit/app/src/SegmentMetricsManager"

import {
  StyledActionButtonContainer,
  StyledActionButtonIcon,
  StyledToolbarActions,
} from "./styled-components"

export interface ActionButtonProps {
  label?: string
  icon?: string
  onClick: () => void
}

export function ActionButton({
  label,
  icon,
  onClick,
}: ActionButtonProps): ReactElement {
  return (
    <div className="stActionButton" data-testid="stActionButton">
      <BaseButton onClick={onClick} kind={BaseButtonKind.HEADER_BUTTON}>
        <StyledActionButtonContainer>
          {icon && (
            <StyledActionButtonIcon
              data-testid={"stActionButtonIcon"}
              icon={icon}
            />
          )}
          {label && <span data-testid="stActionButtonLabel">{label}</span>}
        </StyledActionButtonContainer>
      </BaseButton>
    </div>
  )
}

export interface ToolbarActionsProps {
  sendMessageToHost: (message: IGuestToHostMessage) => void
  hostToolbarItems: IToolbarItem[]
  metricsMgr: SegmentMetricsManager
}

function ToolbarActions({
  sendMessageToHost,
  hostToolbarItems,
  metricsMgr,
}: ToolbarActionsProps): ReactElement {
  return (
    <StyledToolbarActions data-testid="stToolbarActions">
      {hostToolbarItems.map(({ key, label, icon }) => (
        <ActionButton
          key={key}
          label={label}
          icon={icon}
          onClick={() => {
            metricsMgr.enqueue("menuClick", {
              key,
            })
            sendMessageToHost({
              type: "TOOLBAR_ITEM_CALLBACK",
              key,
            })
          }}
        />
      ))}
    </StyledToolbarActions>
  )
}

export default ToolbarActions
