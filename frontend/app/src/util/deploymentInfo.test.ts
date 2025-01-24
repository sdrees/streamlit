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

import { isLocalhost } from "@streamlit/app/src/util/deploymentInfo"

describe("isLocalhost", () => {
  const { location: originalLocation } = window
  beforeEach(() => {
    // Replace window.location with a mutable object that otherwise has
    // the same contents so that we can change hostname below.
    // @ts-expect-error
    delete window.location
    window.location = { ...originalLocation }
  })
  afterEach(() => {
    window.location = originalLocation
  })

  it("returns true given localhost", () => {
    window.location.hostname = "localhost"
    expect(isLocalhost()).toBe(true)
  })

  it("returns true given 127.0.0.1", () => {
    window.location.hostname = "localhost"
    expect(isLocalhost()).toBe(true)
  })

  it("returns false given other", () => {
    window.location.hostname = "190.1.1.1"
    expect(isLocalhost()).toBe(false)
  })

  it("returns false given null", () => {
    // @ts-expect-error
    window.location.hostname = null
    expect(isLocalhost()).toBe(false)
  })

  it("returns false given undefined", () => {
    // @ts-expect-error
    window.location.hostname = undefined
    expect(isLocalhost()).toBe(false)
  })
})
