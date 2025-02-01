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

import { AttachFile } from "@emotion-icons/material-outlined"

import { EmotionTheme } from "~lib/theme"
import Icon from "~lib/components/shared/Icon"
import BaseButton, { BaseButtonKind } from "~lib/components/shared/BaseButton"
import TooltipIcon from "~lib/components/shared/TooltipIcon"
import { AcceptFileValue } from "~lib/util/utils"
import { Placement } from "~lib/components/shared/Tooltip"

import {
  StyledFileUploadArea,
  StyledFileUploadDropzone,
  StyledVerticalDivider,
} from "./styled-components"

export interface Props {
  getRootProps: any
  getInputProps: any
  acceptFile: AcceptFileValue
  showDropzone: boolean
  disabled: boolean
  theme: EmotionTheme
}

const FileUploadArea = ({
  getRootProps,
  getInputProps,
  acceptFile,
  showDropzone,
  disabled,
  theme,
}: Props): React.ReactElement =>
  showDropzone ? (
    <StyledFileUploadDropzone {...getRootProps()}>
      <input {...getInputProps()} />
      Drag and drop files here
    </StyledFileUploadDropzone>
  ) : (
    <StyledFileUploadArea>
      <div data-testid="stChatInputFileUploadButton" {...getRootProps()}>
        <input {...getInputProps()} />
        <TooltipIcon
          content={`Upload or drag and drop ${
            acceptFile === AcceptFileValue.Multiple ? "files" : "a file"
          }`}
          placement={Placement.TOP}
        >
          <BaseButton kind={BaseButtonKind.MINIMAL} disabled={disabled}>
            <Icon
              content={AttachFile}
              size="lg"
              color={theme.colors.fadedText60}
            />
          </BaseButton>
        </TooltipIcon>
      </div>
      <StyledVerticalDivider />
    </StyledFileUploadArea>
  )

export default FileUploadArea
