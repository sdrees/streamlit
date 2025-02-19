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

import { screen } from "@testing-library/react"

import { Video as VideoProto } from "@streamlit/protobuf"

import { render } from "~lib/test_util"
import { mockEndpoints } from "~lib/mocks/mocks"
import { WidgetStateManager as ElementStateManager } from "~lib/WidgetStateManager"
import * as UseResizeObserver from "~lib/hooks/useResizeObserver"

import Video, { VideoProps } from "./Video"

describe("Video Element", () => {
  const buildMediaURL = vi.fn().mockReturnValue("https://mock.media.url")

  const mockSetElementState = vi.fn()
  const mockGetElementState = vi.fn()
  const elementMgrMock = {
    setElementState: mockSetElementState,
    getElementState: mockGetElementState,
    sendRerunBackMsg: vi.fn(),
    formsDataChanged: vi.fn(),
  }

  const getProps = (elementProps: Partial<VideoProto> = {}): VideoProps => ({
    element: VideoProto.create({
      url: "https://www.w3schools.com/html/mov_bbb.mp4",
      type: VideoProto.Type.UNUSED,
      startTime: 0,
      ...elementProps,
    }),
    endpoints: mockEndpoints({ buildMediaURL: buildMediaURL }),
    width: 250,
    elementMgr: elementMgrMock as unknown as ElementStateManager,
  })

  beforeEach(() => {
    vi.clearAllMocks()

    vi.spyOn(UseResizeObserver, "useResizeObserver").mockReturnValue({
      elementRef: React.createRef(),
      forceRecalculate: vitest.fn(),
      values: [250],
    })
  })

  it("renders without crashing", async () => {
    const props = getProps()
    render(<Video {...props} />)

    const videoElement = await screen.findByTestId("stVideo")
    expect(videoElement).toBeInTheDocument()
    expect(videoElement.classList).toContain("stVideo")
  })

  it("has controls", async () => {
    const props = getProps()
    render(<Video {...props} />)

    expect(await screen.findByTestId("stVideo")).toHaveAttribute("controls")
  })

  it("creates its `src` attribute using buildMediaURL", async () => {
    render(<Video {...getProps({ url: "/media/mockVideoFile.mp4" })} />)
    expect(buildMediaURL).toHaveBeenCalledWith("/media/mockVideoFile.mp4")
    expect(await screen.findByTestId("stVideo")).toHaveAttribute(
      "src",
      "https://mock.media.url"
    )
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetElementState.mockReturnValue(false) // By default, assume autoplay is not prevented
  })

  it("does not autoplay if preventAutoplay is set", async () => {
    mockGetElementState.mockReturnValueOnce(true) // Autoplay should be prevented
    const props = getProps({ autoplay: true, id: "uniqueVideoId" })
    render(<Video {...props} />)
    const audioElement = await screen.findByTestId("stVideo")
    expect(audioElement).not.toHaveAttribute("autoPlay")
  })

  it("autoplays if preventAutoplay is not set and autoplay is true", async () => {
    mockGetElementState.mockReturnValueOnce(false) // Autoplay is not prevented
    const props = getProps({ autoplay: true, id: "uniqueVideoId" })
    render(<Video {...props} />)
    const audioElement = await screen.findByTestId("stVideo")
    expect(audioElement).toHaveAttribute("autoPlay")
  })

  it("calls setElementState to prevent future autoplay on first autoplay", () => {
    mockGetElementState.mockReturnValueOnce(false) // Autoplay is not prevented initially
    const props = getProps({ autoplay: true, id: "uniqueVideoId" })
    render(<Video {...props} />)
    expect(mockSetElementState).toHaveBeenCalledTimes(1)
    expect(mockSetElementState).toHaveBeenCalledWith(
      props.element.id,
      "preventAutoplay",
      true
    )
  })

  // Test to ensure that setElementState is not called again if autoplay is already prevented
  it("does not call setElementState again if autoplay is already prevented", () => {
    mockGetElementState.mockReturnValueOnce(true) // Autoplay is already prevented
    const props = getProps({ autoplay: true, id: "uniqueVideoId" })
    render(<Video {...props} />)
    expect(mockSetElementState).not.toHaveBeenCalled()
  })

  describe("YouTube", () => {
    it("renders a youtube iframe", async () => {
      const props = getProps({
        type: VideoProto.Type.YOUTUBE_IFRAME,
      })
      render(<Video {...props} />)
      const videoElement = await screen.findByTestId("stVideo")
      expect(videoElement).toBeInstanceOf(HTMLIFrameElement)
      expect(videoElement).toHaveAttribute(
        "src",
        "https://www.w3schools.com/html/mov_bbb.mp4"
      )
    })

    it("renders a youtube iframe with an starting time", async () => {
      const props = getProps({
        type: VideoProto.Type.YOUTUBE_IFRAME,
        startTime: 10,
      })
      render(<Video {...props} />)
      const videoElement = await screen.findByTestId("stVideo")
      expect(videoElement).toBeInstanceOf(HTMLIFrameElement)
      expect(videoElement).toHaveAttribute(
        "src",
        "https://www.w3schools.com/html/mov_bbb.mp4?start=10"
      )
    })
  })

  describe("updateTime", () => {
    const props = getProps()

    it("sets the current time to startTime on render", async () => {
      render(<Video {...props} />)
      const videoElement = (await screen.findByTestId(
        "stVideo"
      )) as HTMLMediaElement
      expect(videoElement.currentTime).toBe(0)
    })

    it("updates the current time when startTime is changed", async () => {
      const { rerender } = render(<Video {...props} />)
      const videoElement = (await screen.findByTestId(
        "stVideo"
      )) as HTMLMediaElement
      expect(videoElement.currentTime).toBe(0)

      rerender(<Video {...getProps({ startTime: 10 })} />)
      expect(videoElement.currentTime).toBe(10)
    })
  })
})
