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
import styled from "@emotion/styled"

import { FileStatus } from "~lib/components/widgets/FileUploader/UploadFileInfo"

export const StyledFileUploadDropzone = styled.div(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "auto",
  height: "100%",
  width: "100%",
  color: theme.colors.primary,
  fontWeight: theme.fontWeights.bold,
}))

export const StyledFileUploadArea = styled.div(({}) => ({
  display: "flex",
  alignItems: "top",
  height: "100%",
}))

export const StyledVerticalDivider = styled.div(({ theme }) => ({
  // We need to use hard-coded in order to align the divider centered
  // given the height of chat input and divider.
  marginTop: "0.625em",
  marginLeft: theme.spacing.sm,
  height: theme.spacing.xl,
  width: theme.sizes.borderWidth,
  backgroundColor: theme.colors.fadedText20,
}))

export const StyledChatUploadedFiles = styled.div(({ theme }) => ({
  left: 0,
  right: 0,
  border: `${theme.sizes.borderWidth} solid ${theme.colors.transparent}`,
  minHeight: theme.sizes.minChatInputFileListHeight,
  lineHeight: theme.lineHeights.tight,
  paddingLeft: theme.spacing.sm,
  paddingRight: theme.spacing.sm,
  overflowX: "auto",
}))

export const StyledUploadedChatFileList = styled.div(({}) => ({
  display: "flex",
}))

export const StyledUploadedChatFileListItem = styled.div(({}) => ({
  flex: "0 0 auto",
}))

export const StyledChatUploadedFile = styled.div(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing.sm,
  gap: theme.spacing.twoXS,
}))

export const StyledChatUploadedFileIcon = styled.div(({ theme }) => ({
  color: theme.colors.fadedText60,
}))

export interface StyledChatUploadedFileStatusProps {
  fileStatus: FileStatus
}

export const StyledChatUploadedFileName =
  styled.div<StyledChatUploadedFileStatusProps>(({ theme, fileStatus }) => ({
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    color:
      fileStatus.type === "uploaded"
        ? theme.colors.bodyText
        : theme.colors.fadedText60,
  }))

export const StyledChatUploadedFileSize = styled.div(({ theme }) => ({
  marginRight: theme.spacing.md,
  color: theme.colors.fadedText60,
}))

export const StyledChatUploadedFileDeleteButton = styled.small(
  ({ theme }) => ({
    display: "flex",
    alignItems: "center",
    maxHeight: theme.sizes.smallElementHeight,
    color: theme.colors.fadedText60,
    "& :hover": {
      color: theme.colors.bodyText,
    },
  })
)
