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

import { BaseProvider, LightTheme } from "baseui"
import { screen } from "@testing-library/react"

import { Spinner as SpinnerProto } from "@streamlit/protobuf"

import { render } from "~lib/test_util"

import Spinner, { formatTime, SpinnerProps } from "./Spinner"

const getProps = (
  propOverrides: Partial<SpinnerProps> = {},
  elementOverrides: Partial<SpinnerProto> = {}
): SpinnerProps => ({
  element: SpinnerProto.create({
    text: "Loading...",
    ...elementOverrides,
  }),
  ...propOverrides,
})

describe("Spinner component", () => {
  it("renders without crashing", () => {
    render(
      <BaseProvider theme={LightTheme}>
        <Spinner {...getProps()} />
      </BaseProvider>
    )

    const spinnerContainer = screen.getByTestId("stSpinner")
    expect(spinnerContainer).toBeInTheDocument()
    expect(spinnerContainer).toHaveClass("stSpinner")
  })

  it("sets the text and width correctly", () => {
    render(
      <BaseProvider theme={LightTheme}>
        <Spinner {...getProps()} />
      </BaseProvider>
    )

    const markdownText = screen.getByText("Loading...")
    expect(markdownText).toBeInTheDocument()
  })

  it("sets additional className/CSS for caching spinner", () => {
    render(
      <BaseProvider theme={LightTheme}>
        <Spinner {...getProps({}, { cache: true })} />
      </BaseProvider>
    )

    const spinnerContainer = screen.getByTestId("stSpinner")
    expect(spinnerContainer).toBeInTheDocument()

    expect(spinnerContainer).toHaveClass("stSpinner")
    expect(spinnerContainer).toHaveClass("stCacheSpinner")
    expect(spinnerContainer).toHaveStyle("paddingBottom: 1rem")
  })

  it("shows timer when showTime is true", () => {
    render(
      <BaseProvider theme={LightTheme}>
        <Spinner {...getProps({}, { showTime: true })} />
      </BaseProvider>
    )

    const spinnerContainer = screen.getByTestId("stSpinner")
    expect(spinnerContainer).toBeInTheDocument()
    expect(screen.getByText("(0.0 seconds)")).toBeInTheDocument()
  })
})

describe("formatTime", () => {
  it.each([
    [0, "(0.0 seconds)"],
    [1.5, "(1.5 seconds)"],
    [45.2, "(45.2 seconds)"],
    [60, "(1 minute)"],
    [61.5, "(1 minute, 1.5 seconds)"],
    [122.2, "(2 minutes, 2.2 seconds)"],
    [3600, "(1 hour)"],
    [3660, "(1 hour, 1 minute)"],
    [3661.5, "(1 hour, 1 minute, 1.5 seconds)"],
    [7384.2, "(2 hours, 3 minutes, 4.2 seconds)"],
  ])("formats %s to %s", (value, expected) => {
    expect(formatTime(value)).toEqual(expected)
  })
})
