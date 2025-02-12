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

import React, {
  ChangeEvent,
  KeyboardEvent,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { useTheme } from "@emotion/react"
import { Send } from "@emotion-icons/material-rounded"
import { Textarea as UITextArea } from "baseui/textarea"
import { useDropzone } from "react-dropzone"

import {
  ChatInput as ChatInputProto,
  FileUploaderState as FileUploaderStateProto,
  IChatInputValue,
  IFileURLs,
  UploadedFileInfo as UploadedFileInfoProto,
} from "@streamlit/protobuf"

import {
  AcceptFileValue,
  chatInputAcceptFileProtoValueToEnum,
  isNullOrUndefined,
} from "~lib/util/utils"
import { WidgetStateManager } from "~lib/WidgetStateManager"
import Icon from "~lib/components/shared/Icon"
import InputInstructions from "~lib/components/shared/InputInstructions/InputInstructions"
import { isEnterKeyPressed } from "~lib/util/inputUtils"
import {
  UploadedStatus,
  UploadFileInfo,
} from "~lib/components/widgets/FileUploader/UploadFileInfo"
import { FileUploadClient } from "~lib/FileUploadClient"
import { getAccept } from "~lib/components/widgets/FileUploader/FileDropzone"

import {
  StyledChatInput,
  StyledChatInputContainer,
  StyledInputInstructionsContainer,
  StyledSendIconButton,
  StyledSendIconButtonContainer,
} from "./styled-components"
import ChatUploadedFiles from "./fileUpload/ChatUploadedFiles"
import FileUploadArea from "./fileUpload/FileUploadArea"
import { createUploadFileHandler } from "./fileUpload/createFileUploadHandler"
import { createDropHandler } from "./fileUpload/createDropHandler"

export interface Props {
  disabled: boolean
  element: ChatInputProto
  widgetMgr: WidgetStateManager
  width: number
  uploadClient: FileUploadClient
  fragmentId?: string
}

// We want to show easily that there's scrolling so we deliberately choose
// a half size.
const MAX_VISIBLE_NUM_LINES = 6.5
// Rounding errors can arbitrarily create scrollbars. We add a rounding offset
// to manage it better.
const ROUNDING_OFFSET = 1

const updateFile = (
  id: number,
  fileInfo: UploadFileInfo,
  currentFiles: UploadFileInfo[]
): UploadFileInfo[] => currentFiles.map(f => (f.id === id ? fileInfo : f))

const getFile = (
  localFileId: number,
  currentFiles: UploadFileInfo[]
): UploadFileInfo | undefined => currentFiles.find(f => f.id === localFileId)

function ChatInput({
  width,
  element,
  widgetMgr,
  fragmentId,
  uploadClient,
}: Props): React.ReactElement {
  const theme = useTheme()

  const chatInputRef = useRef<HTMLTextAreaElement>(null)
  const counterRef = useRef(0)
  const heightGuidance = useRef({ minHeight: 0, maxHeight: 0 })

  // True if the user-specified state.value has not yet been synced to the WidgetStateManager.
  const [dirty, setDirty] = useState(false)
  // The value specified by the user via the UI. If the user didn't touch this widget's UI, the default value is used.
  const [value, setValue] = useState(element.default)
  // The value of the height of the textarea. It depends on a variety of factors including the default height, and autogrowing
  const [scrollHeight, setScrollHeight] = useState(0)
  const [isInputExtended, setIsInputExtended] = useState(false)
  const [files, setFiles] = useState<UploadFileInfo[]>([])

  const [fileDragged, setFileDragged] = useState(false)

  const acceptFile = chatInputAcceptFileProtoValueToEnum(element.acceptFile)

  const addFiles = useCallback(
    (filesToAdd: UploadFileInfo[]): void =>
      setFiles(currentFiles => [...currentFiles, ...filesToAdd]),
    []
  )

  const deleteFile = useCallback(
    (fileId: number): void => {
      setFiles(files => {
        const file = getFile(fileId, files)
        if (isNullOrUndefined(file)) {
          return files
        }

        if (file.status.type === "uploading") {
          // Cancel request as the file hasn't been uploaded.
          // However, it may have been received by the server so we'd still
          // send out a request to delete it.
          file.status.cancelToken.cancel()
        }

        if (
          file.status.type === "uploaded" &&
          file.status.fileUrls.deleteUrl
        ) {
          uploadClient.deleteFile(file.status.fileUrls.deleteUrl)
        }

        return files.filter(file => file.id !== fileId)
      })
    },
    [uploadClient]
  )

  const createChatInputWidgetFilesValue = (): FileUploaderStateProto => {
    const uploadedFileInfo: UploadedFileInfoProto[] = files
      .filter(f => f.status.type === "uploaded")
      .map(f => {
        const { name, size, status } = f
        const { fileId, fileUrls } = status as UploadedStatus
        return new UploadedFileInfoProto({
          fileId,
          fileUrls,
          name,
          size,
        })
      })

    return new FileUploaderStateProto({ uploadedFileInfo })
  }

  const getNextLocalFileId = (): number => {
    return counterRef.current++
  }

  const dropHandler = createDropHandler({
    acceptMultipleFiles: acceptFile === AcceptFileValue.Multiple,
    uploadClient: uploadClient,
    uploadFile: createUploadFileHandler({
      getNextLocalFileId,
      addFiles,
      updateFile: (id: number, fileInfo: UploadFileInfo) => {
        setFiles(files => updateFile(id, fileInfo, files))
      },
      uploadClient,
      element,
      onUploadProgress: (e: ProgressEvent, fileId: number) => {
        setFiles(files => {
          const file = getFile(fileId, files)
          if (isNullOrUndefined(file) || file.status.type !== "uploading") {
            return files
          }

          const newProgress = Math.round((e.loaded * 100) / e.total)
          if (file.status.progress === newProgress) {
            return files
          }

          return updateFile(
            fileId,
            file.setStatus({
              type: "uploading",
              cancelToken: file.status.cancelToken,
              progress: newProgress,
            }),
            files
          )
        })
      },
      onUploadComplete: (id: number, fileUrls: IFileURLs) => {
        setFiles(files => {
          const curFile = getFile(id, files)
          if (
            isNullOrUndefined(curFile) ||
            curFile.status.type !== "uploading"
          ) {
            // The file may have been canceled right before the upload
            // completed. In this case, we just bail.
            return files
          }

          return updateFile(
            curFile.id,
            curFile.setStatus({
              type: "uploaded",
              fileId: fileUrls.fileId as string,
              fileUrls,
            }),
            files
          )
        })
      },
    }),
    addFiles,
    getNextLocalFileId,
    deleteExistingFiles: () => files.forEach(f => deleteFile(f.id)),
    onUploadComplete: () => {
      if (chatInputRef.current) {
        chatInputRef.current.focus()
      }
    },
  })

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: dropHandler,
    multiple: acceptFile === AcceptFileValue.Multiple,
    accept: getAccept(element.fileType),
  })

  const getScrollHeight = (): number => {
    let scrollHeight = 0
    const { current: textarea } = chatInputRef
    if (textarea) {
      const placeholder = textarea.placeholder
      textarea.placeholder = ""
      textarea.style.height = "auto"
      scrollHeight = textarea.scrollHeight
      textarea.placeholder = placeholder
      textarea.style.height = ""
    }

    return scrollHeight
  }

  const handleSubmit = (): void => {
    // We want the chat input to always be in focus
    // even if the user clicks the submit button
    if (chatInputRef.current) {
      chatInputRef.current.focus()
    }

    if (!dirty || element.disabled) {
      return
    }

    const composedValue: IChatInputValue = {
      data: value,
      fileUploaderState: createChatInputWidgetFilesValue(),
    }

    widgetMgr.setChatInputValue(
      element,
      composedValue,
      { fromUi: true },
      fragmentId
    )
    setDirty(false)
    setFiles([])
    setValue("")
    setScrollHeight(0)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>): void => {
    const { metaKey, ctrlKey, shiftKey } = e
    const shouldSubmit =
      isEnterKeyPressed(e) && !shiftKey && !ctrlKey && !metaKey

    if (shouldSubmit) {
      e.preventDefault()

      handleSubmit()
    }
  }

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    const { value } = e.target
    const { maxChars } = element

    if (maxChars !== 0 && value.length > maxChars) {
      return
    }

    setValue(value)
    setScrollHeight(getScrollHeight())
  }

  useEffect(
    () =>
      // Disable send button if there are files still being uploaded
      files.some(f => f.status.type === "uploading")
        ? setDirty(false)
        : setDirty(value !== "" || files.length > 0),
    [files, value]
  )

  useEffect(() => {
    if (element.setValue) {
      // We are intentionally setting this to avoid regularly calling this effect.
      // TODO: Update to match React best practices
      // eslint-disable-next-line react-compiler/react-compiler
      element.setValue = false
      const val = element.value || ""
      setValue(val)
    }
  }, [element])

  useEffect(() => {
    if (chatInputRef.current) {
      const { offsetHeight } = chatInputRef.current
      heightGuidance.current.minHeight = offsetHeight
      heightGuidance.current.maxHeight = offsetHeight * MAX_VISIBLE_NUM_LINES
    }
  }, [chatInputRef])

  useEffect(() => {
    const handleDragEnter = (event: DragEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      if (!fileDragged && event.dataTransfer?.types.includes("Files")) {
        setFileDragged(true)
      }
    }

    const handleDragLeave = (event: DragEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      if (fileDragged) {
        // This check prevents the dropzone from flickering since the dragleave
        // event could fire when user is dragging within the window
        if (
          (event.clientX <= 0 && event.clientY <= 0) ||
          (event.clientX >= window.innerWidth &&
            event.clientY >= window.innerHeight)
        ) {
          setFileDragged(false)
        }
      }
    }

    const handleDrop = (event: DragEvent): void => {
      event.preventDefault()
      event.stopPropagation()
      if (fileDragged) {
        setFileDragged(false)
      }
    }

    window.addEventListener("dragover", handleDragEnter)
    window.addEventListener("drop", handleDrop)
    window.addEventListener("dragleave", handleDragLeave)

    return () => {
      window.removeEventListener("dragover", handleDragEnter)
      window.removeEventListener("drop", handleDrop)
      window.removeEventListener("dragleave", handleDragLeave)
    }
  }, [fileDragged])

  useEffect(() => {
    const { minHeight } = heightGuidance.current
    setIsInputExtended(
      scrollHeight > 0 && chatInputRef.current
        ? Math.abs(scrollHeight - minHeight) > ROUNDING_OFFSET
        : false
    )
  }, [scrollHeight])

  const { disabled, placeholder, maxChars } = element
  const { maxHeight } = heightGuidance.current

  const showDropzone = acceptFile !== AcceptFileValue.None && fileDragged
  const containerClass = "stChatInput"

  return (
    <>
      {acceptFile === AcceptFileValue.None ? null : (
        <ChatUploadedFiles items={[...files]} onDelete={deleteFile} />
      )}
      <StyledChatInputContainer
        className={
          showDropzone ? `${containerClass} dropzone` : containerClass
        }
        data-testid="stChatInput"
        width={width}
      >
        <StyledChatInput>
          {acceptFile === AcceptFileValue.None ? null : (
            <FileUploadArea
              getRootProps={getRootProps}
              getInputProps={getInputProps}
              acceptFile={acceptFile}
              showDropzone={showDropzone}
              disabled={disabled}
              theme={theme}
            />
          )}
          {showDropzone ? null : (
            <>
              <UITextArea
                inputRef={chatInputRef}
                value={value}
                placeholder={placeholder}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                aria-label={placeholder}
                disabled={disabled}
                rows={1}
                overrides={{
                  Root: {
                    style: {
                      minHeight: theme.sizes.minElementHeight,
                      outline: "none",
                      borderLeftWidth: "0",
                      borderRightWidth: "0",
                      borderTopWidth: "0",
                      borderBottomWidth: "0",
                    },
                  },
                  Input: {
                    props: {
                      "data-testid": "stChatInputTextArea",
                    },
                    style: {
                      lineHeight: theme.lineHeights.inputWidget,
                      "::placeholder": {
                        opacity: "0.7",
                      },
                      height: isInputExtended
                        ? `${scrollHeight + ROUNDING_OFFSET}px`
                        : "auto",
                      maxHeight: maxHeight ? `${maxHeight}px` : "none",
                      // Baseweb requires long-hand props, short-hand leads to weird bugs & warnings.
                      paddingLeft: theme.spacing.none,
                      paddingBottom: theme.spacing.sm,
                      paddingTop: theme.spacing.sm,
                      // Calculate the right padding to account for the send icon (iconSizes.xl + 2 * spacing.sm)
                      // and some additional margin between the icon and the text (spacing.sm).
                      paddingRight: `calc(${theme.iconSizes.xl} + 2 * ${theme.spacing.sm} + ${theme.spacing.sm})`,
                    },
                  },
                }}
              />
              {/* Hide the character limit in small widget sizes */}
              {width > theme.breakpoints.hideWidgetDetails && (
                <StyledInputInstructionsContainer>
                  <InputInstructions
                    dirty={dirty}
                    value={value}
                    maxLength={maxChars}
                    type="chat"
                    // Chat Input are not able to be used in forms
                    inForm={false}
                  />
                </StyledInputInstructionsContainer>
              )}
              <StyledSendIconButtonContainer>
                <StyledSendIconButton
                  onClick={handleSubmit}
                  disabled={!dirty || disabled}
                  extended={isInputExtended}
                  data-testid="stChatInputSubmitButton"
                >
                  <Icon content={Send} size="xl" color="inherit" />
                </StyledSendIconButton>
              </StyledSendIconButtonContainer>
            </>
          )}
        </StyledChatInput>
      </StyledChatInputContainer>
    </>
  )
}

export default memo(ChatInput)
