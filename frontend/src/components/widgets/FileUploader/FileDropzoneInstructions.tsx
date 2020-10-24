/**
 * @license
 * Copyright 2018-2020 Streamlit Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from "react"
import { MaterialIcon } from "components/shared/Icon"
import { styled } from "styletron-react"

import { FileSizes, getSizeDisplay } from "lib/FileHelper"
import { colors, Sizes, spacing } from "lib/widgetTheme"

import { Small } from "components/shared/TextElements"

export interface Props {
  multiple: boolean
  acceptedExtensions: string[]
  maxSizeBytes: number
}

const StyledInstructions = styled("div", {
  marginRight: "auto",
  alignItems: "center",
  display: "flex",
})

const FileUploaderIcon = styled(MaterialIcon, {
  color: colors.secondary,
  marginRight: spacing.lg,
})

const StyledSpan = styled("span", {
  marginBottom: spacing.xxs,
})

const FlexColumn = styled("div", {
  display: "flex",
  flexDirection: "column",
})

const FileDropzoneInstructions = ({
  multiple,
  acceptedExtensions,
  maxSizeBytes,
}: Props): React.ReactElement => (
  <StyledInstructions>
    <FileUploaderIcon
      icon="cloud_upload"
      type="outlined"
      size={Sizes.LARGE}
      className="fileUploaderIcon"
    />
    <FlexColumn>
      <StyledSpan>Drag and drop file{multiple ? "s" : ""} here</StyledSpan>
      <Small>
        {`Limit ${getSizeDisplay(maxSizeBytes, FileSizes.Byte, 0)} per file`}
        {acceptedExtensions.length
          ? ` • ${acceptedExtensions
              .join(", ")
              .replace(/\./g, "")
              .toUpperCase()}`
          : null}
      </Small>
    </FlexColumn>
  </StyledInstructions>
)

export default FileDropzoneInstructions
