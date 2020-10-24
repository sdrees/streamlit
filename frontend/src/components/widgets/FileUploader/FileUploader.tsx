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
import axios from "axios"
import { FileRejection } from "react-dropzone"
import { FileUploader as FileUploaderProto } from "autogen/proto"

import {
  ExtendedFile,
  FileSizes,
  FileStatuses,
  getSizeDisplay,
  sizeConverter,
} from "lib/FileHelper"
import { FileUploadClient } from "lib/FileUploadClient"
import { WidgetStateManager } from "lib/WidgetStateManager"

import AlertContainer, {
  Kind as AlertKind,
} from "components/shared/AlertContainer"
import FileDropzone from "./FileDropzone"
import UploadedFiles from "./UploadedFiles"
import "./FileUploader.scss"

export interface Props {
  disabled: boolean
  element: FileUploaderProto
  widgetStateManager: WidgetStateManager
  uploadClient: FileUploadClient
  width: number
}

interface State {
  status: "READY" | "UPLOADING" | "UPLOADED" | "ERROR"
  errorMessage?: string
  files: ExtendedFile[]
  maxSizeBytes: number
}

class FileUploader extends React.PureComponent<Props, State> {
  public constructor(props: Props) {
    super(props)
    const maxMbs = props.element.maxUploadSizeMb

    this.state = {
      status: "READY",
      errorMessage: undefined,
      files: [],
      maxSizeBytes: sizeConverter(maxMbs, FileSizes.MegaByte, FileSizes.Byte),
    }
  }

  public componentDidUpdate = (prevProps: Props): void => {
    // Widgets are disabled if the app is not connected anymore.
    // If the app disconnects from the server, a new session is created and users
    // will lose access to the files they uploaded in their previous session.
    // If we are reconnecting, reset the file uploader so that the widget is
    // in sync with the new session.
    if (prevProps.disabled !== this.props.disabled && this.props.disabled) {
      this.reset()
    }

    const currentMaxSize = this.props.element.maxUploadSizeMb
    if (prevProps.element.maxUploadSizeMb !== currentMaxSize) {
      this.setState({
        maxSizeBytes: sizeConverter(
          currentMaxSize,
          FileSizes.MegaByte,
          FileSizes.Byte
        ),
      })
    }
  }

  public reset = (): void => {
    this.setState({
      status: FileStatuses.READY,
      errorMessage: undefined,
      files: [],
    })
  }

  /**
   * @param {ExtendedFile[]} acceptedFiles react-dropzone returns an array of
   * files. ExtendedFile extends File so we can type it into an array of
   * ExtendedFile
   * @param {FileRejection[]} rejectedFiles react-dropzone returns an array
   * of FileRejections which consists of the files and errors encountered.
   */
  public dropHandler = (
    acceptedFiles: ExtendedFile[],
    rejectedFiles: FileRejection[]
  ): void => {
    const { element } = this.props
    const { multipleFiles } = element

    if (!multipleFiles && this.state.files.length) {
      // Only one file is allowed. Remove existing file
      this.removeFile(this.state.files[0].id || "")
    }

    // Too many files were uploaded. Upload the first eligible file
    // and reject the rest
    if (rejectedFiles.length > 1 && !multipleFiles) {
      const firstFileIndex = rejectedFiles.findIndex(
        file =>
          file.errors.length === 1 && file.errors[0].code === "too-many-files"
      )

      if (firstFileIndex >= 0) {
        const firstFile: FileRejection = rejectedFiles[firstFileIndex]
        this.uploadFile(firstFile.file, acceptedFiles.length)
        this.rejectFiles([
          ...rejectedFiles.slice(0, firstFileIndex),
          ...rejectedFiles.slice(firstFileIndex + 1),
        ])
      } else {
        this.rejectFiles(rejectedFiles)
      }
    } else {
      this.rejectFiles(rejectedFiles)
    }

    acceptedFiles.map(this.uploadFile)
  }

  private handleFile = (file: ExtendedFile, index: number): void => {
    // Add an unique ID to each file for server and client to sync on
    file.id = `${index}${new Date().getTime()}`
    // Add a cancel token to cancel file upload
    file.cancelToken = axios.CancelToken.source()
    this.setState(state => ({ files: [file, ...state.files] }))
  }

  private uploadFile = (file: ExtendedFile, index: number): void => {
    file.progress = 1
    file.status = FileStatuses.UPLOADING
    this.handleFile(file, index)
    this.props.uploadClient
      .uploadFiles(
        this.props.element.id,
        [file],
        e => this.onUploadProgress(e, file),
        file.cancelToken
          ? file.cancelToken.token
          : axios.CancelToken.source().token,
        !this.props.element.multipleFiles
      )
      .then(() => {
        this.setState(state => {
          const files = state.files.map(existingFile => {
            // Destructing a file object causes us to lose the
            // File object properties i.e. size.
            if (file.id === existingFile.id) {
              delete file.progress
              delete file.cancelToken
              file.status = FileStatuses.UPLOADED
              return file
            }
            return existingFile
          })
          return { files }
        })
      })
      .catch(err => {
        if (axios.isCancel(err)) {
          // If this was a cancel error, we don't show the user an error -
          // the cancellation was in response to an action they took
          this.setState(state => ({
            files: state.files.map(existingFile => {
              if (file.id === existingFile.id) {
                return file
              }
              return existingFile
            }),
          }))
        } else {
          this.setState({
            status: "ERROR",
            errorMessage: err ? err.toString() : "Unknown error",
          })
        }
      })
  }

  private rejectFiles = (rejectedFiles: FileRejection[]): void => {
    rejectedFiles.forEach((rejectedFile, index) => {
      Object.assign(rejectedFile.file, {
        status: FileStatuses.ERROR,
        errorMessage: this.getErrorMessage(
          rejectedFile.errors[0].code,
          rejectedFile.file
        ),
      })
      this.handleFile(rejectedFile.file, index)
    })
  }

  private getErrorMessage = (
    errorCode: string,
    file: ExtendedFile
  ): string => {
    switch (errorCode) {
      case "file-too-large":
        return `File must be ${getSizeDisplay(
          this.state.maxSizeBytes,
          FileSizes.Byte
        )} or smaller.`
      case "file-invalid-type":
        return `${file.type} files are not allowed.`
      case "file-too-small":
        // This should not fire.
        return `File size is too small.`
      case "too-many-files":
        return "Only one file is allowed."
      default:
        return "Unexpected error. Please try again."
    }
  }

  private delete = (fileId: string): void => {
    // TODO resolve typing issues
    // @ts-ignore
    this.setState(state => {
      const files = [...state.files]
      const file = files.find(file => file.id === fileId)
      if (fileId && file) {
        if (file.cancelToken) {
          // The file hasn't been uploaded. Let's cancel the request
          file.cancelToken.cancel()
        }
        file.status = FileStatuses.DELETING
        if (file.errorMessage || file.cancelToken) {
          this.removeFile(fileId)
          return null
        }

        this.props.uploadClient
          .delete(this.props.element.id, fileId)
          .then(() => this.removeFile(fileId))
        return { files: state.files }
      }
      const errorMessage = "File not found. Please try again."
      return {
        status: FileStatuses.ERROR,
        errorMessage,
      }
    })
  }

  private removeFile = (fileId: string): void => {
    this.setState(state => {
      const filteredFiles = state.files.filter(file => file.id !== fileId)
      return {
        status: filteredFiles.length
          ? FileStatuses.UPLOADED
          : FileStatuses.READY,
        errorMessage: undefined,
        files: filteredFiles,
      }
    })
  }

  private onUploadProgress = (
    progressEvent: ProgressEvent,
    file: ExtendedFile
  ): void => {
    file.progress = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    )

    this.setState(state => {
      const files = state.files.map(uploadingFile =>
        uploadingFile.id === file.id ? file : uploadingFile
      )

      return { files }
    })
  }

  public render = (): React.ReactNode => {
    const { maxSizeBytes, errorMessage, files } = this.state
    const { element, disabled } = this.props
    const acceptedExtensions = element.type

    return (
      <div className="Widget stFileUploader">
        <label>{element.label}</label>
        {errorMessage ? (
          <AlertContainer kind={AlertKind.ERROR}>
            {errorMessage}
          </AlertContainer>
        ) : null}
        <FileDropzone
          onDrop={this.dropHandler}
          multiple={element.multipleFiles}
          acceptedExtensions={acceptedExtensions}
          maxSizeBytes={maxSizeBytes}
          disabled={disabled}
        />
        <UploadedFiles
          items={[...files]}
          pageSize={3}
          onDelete={this.delete}
          className="ml-5 pl-1"
          resetOnAdd
        />
      </div>
    )
  }
}

export default FileUploader
