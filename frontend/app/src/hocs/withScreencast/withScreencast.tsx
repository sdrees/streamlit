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
  ComponentType,
  FC,
  PropsWithChildren,
  useCallback,
  useRef,
  useState,
} from "react"

import hoistNonReactStatics from "hoist-non-react-statics"
import { getLogger } from "loglevel"

import { isNullOrUndefined } from "@streamlit/utils"
import ScreenCastRecorder from "@streamlit/app/src/util/ScreenCastRecorder"
import {
  ScreencastDialog,
  UnsupportedBrowserDialog,
  VideoRecordedDialog,
} from "@streamlit/app/src/hocs/withScreencast/components"
import Countdown from "@streamlit/app/src/components/Countdown"

export type Steps =
  | "UNSUPPORTED"
  | "OFF"
  | "SETUP"
  | "COUNTDOWN"
  | "RECORDING"
  | "PREVIEW_FILE"

export interface ScreenCastHOC {
  currentState: Steps
  toggleRecordAudio: () => void
  startRecording: (fileName: string) => void
  stopRecording: () => void
}

interface InjectedProps {
  screenCast: ScreenCastHOC
  testOverride?: Steps
}

type WrappedProps<P extends InjectedProps> = Omit<P, "screenCast">

const log = getLogger("withScreencast")

function withScreencast<P extends InjectedProps>(
  WrappedComponent: ComponentType<PropsWithChildren<P>>
): FC<PropsWithChildren<WrappedProps<P>>> {
  const ComponentWithScreencast: FC<
    PropsWithChildren<WrappedProps<P>>
  > = props => {
    const { testOverride } = props as P

    // Recorder ref to persist instance between renders
    const recorderRef = useRef<ScreenCastRecorder | null>(null)

    const [fileName, setFileName] = useState("streamlit-screencast")
    const [recordAudio, setRecordAudio] = useState(false)
    const [outputBlob, setOutputBlob] = useState<Blob | undefined>(undefined)
    const [currentState, setCurrentState] = useState<Steps>(
      testOverride || "OFF"
    )

    // Toggle audio recording
    const toggleRecordAudio = useCallback((): void => {
      setRecordAudio(prev => !prev)
    }, [])

    // Stop recording and produce the output blob if needed
    const stopRecording = useCallback(async (): Promise<void> => {
      if (currentState === "OFF" || isNullOrUndefined(recorderRef.current)) {
        // No-op if we never started
        return
      }

      if (currentState === "COUNTDOWN") {
        setCurrentState("OFF")
        return
      }

      if (currentState === "RECORDING") {
        const recorder = recorderRef.current
        if (!recorder || recorder.getState() === "inactive") {
          setCurrentState("OFF")
        } else {
          const blob = await recorder.stop()
          setOutputBlob(blob)
          setCurrentState("PREVIEW_FILE")
        }
      }
    }, [currentState])

    // Actually start the recording (called after the user sees the setup dialog)
    const startActualRecording = useCallback(async (): Promise<void> => {
      if (!ScreenCastRecorder.isSupportedBrowser()) {
        setCurrentState("UNSUPPORTED")
        return
      }
      recorderRef.current = new ScreenCastRecorder({
        recordAudio,
        onErrorOrStop: () => {
          stopRecording().catch(err =>
            log.warn(`withScreencast.stopRecording threw an error: ${err}`)
          )
        },
      })

      try {
        await recorderRef.current.initialize()
      } catch (e) {
        log.warn(`ScreenCastRecorder.initialize error: ${e}`)
        setCurrentState("UNSUPPORTED")
        return
      }

      setCurrentState("COUNTDOWN")
    }, [recordAudio, stopRecording])

    const showDialog = useCallback(
      (newFileName: string): void => {
        if (!ScreenCastRecorder.isSupportedBrowser()) {
          setCurrentState("UNSUPPORTED")
          return
        }

        if (currentState === "OFF") {
          setFileName(newFileName)
          setCurrentState("SETUP")
          return
        }

        // If we are currently in any other state, stop any ongoing recording
        stopRecording().catch(err =>
          log.warn(`withScreencast.stopRecording threw an error: ${err}`)
        )
      },
      [currentState, stopRecording]
    )

    // Called when countdown ends (the actual start of the recording)
    const onCountdownEnd = useCallback(async () => {
      if (isNullOrUndefined(recorderRef.current)) {
        // Should never happen.
        throw new Error("Countdown finished but recorder is null")
      }
      const hasStarted = recorderRef.current.start()
      if (hasStarted) {
        setCurrentState("RECORDING")
      } else {
        stopRecording().catch(err =>
          log.warn(`withScreencast.stopRecording threw an error: ${err}`)
        )
      }
    }, [stopRecording])

    // Close the recording dialog
    const closeDialog = useCallback((): void => {
      setCurrentState("OFF")
    }, [])

    // The object we inject into the wrapped component
    const screenCast: ScreenCastHOC = {
      currentState,
      toggleRecordAudio,
      startRecording: showDialog, // triggers the setup/showDialog process
      stopRecording,
    }

    // Render
    return (
      <div className="withScreencast" data-testid="stScreencast">
        <WrappedComponent {...(props as P)} screenCast={screenCast} />
        {currentState === "UNSUPPORTED" && (
          <UnsupportedBrowserDialog onClose={closeDialog} />
        )}

        {currentState === "SETUP" && (
          <ScreencastDialog
            recordAudio={recordAudio}
            onClose={closeDialog}
            startRecording={startActualRecording}
            toggleRecordAudio={toggleRecordAudio}
          />
        )}

        {currentState === "COUNTDOWN" && (
          <Countdown countdown={3} endCallback={onCountdownEnd} />
        )}

        {currentState === "PREVIEW_FILE" && outputBlob && (
          <VideoRecordedDialog
            onClose={closeDialog}
            videoBlob={outputBlob}
            fileName={fileName}
          />
        )}
      </div>
    )
  }

  // Set the display name for easier debugging
  ComponentWithScreencast.displayName = `withScreencast(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`

  // Static methods must be copied over
  // https://en.reactjs.org/docs/higher-order-components.html#static-methods-must-be-copied-over
  return hoistNonReactStatics(ComponentWithScreencast, WrappedComponent)
}

export default withScreencast
