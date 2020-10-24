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
import { mount } from "enzyme"

import Balloons, { Props, NUM_BALLOONS } from "./Balloons"

const getProps = (): Props => ({
  reportId: "51522269",
})

describe("Balloons element", () => {
  jest.useFakeTimers()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  it("renders without crashing", () => {
    const props = getProps()
    const wrapper = mount(<Balloons {...props} />)

    expect(wrapper).toBeDefined()
    expect(wrapper.find(".balloons img").length).toBe(NUM_BALLOONS)

    wrapper.find(".balloons img").forEach(node => {
      expect(node.prop("src")).toBeTruthy()
      expect(node.prop("style")).toHaveProperty("left")
      expect(node.prop("style")).toHaveProperty("animationDelay")
    })
  })
})
