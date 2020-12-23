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
import { mount } from "lib/test_util"
import { ModalHeader, ModalBody } from "components/shared/Modal"

import VideoRecordedDialog, { Props } from "./VideoRecordedDialog"

URL.createObjectURL = jest.fn()

const getProps = (props: Partial<Props> = {}): Props => ({
  fileName: "test",
  onClose: jest.fn(),
  videoBlob: new Blob(),
  ...props,
})

describe("VideoRecordedDialog", () => {
  it("renders without crashing", () => {
    const wrapper = mount(<VideoRecordedDialog {...getProps()} />)

    expect(wrapper.html()).not.toBeNull()
  })

  it("should render a header", () => {
    const props = getProps()
    const wrapper = mount(<VideoRecordedDialog {...props} />)
    const headerWrapper = wrapper.find(ModalHeader)
    expect(headerWrapper.props().children).toBe("Next steps")
  })

  it("should render a video", () => {
    const wrapper = mount(<VideoRecordedDialog {...getProps()} />)
    const bodyWrapper = wrapper.find(ModalBody)

    expect(bodyWrapper.find("StyledVideo").length).toBe(1)
    expect(URL.createObjectURL).toBeCalled()
  })

  it("should render a download button", () => {
    const props = getProps()
    const wrapper = mount(<VideoRecordedDialog {...props} />)
    const buttonWrapper = wrapper.find(ModalBody).find("Button")

    buttonWrapper.simulate("click")

    expect(buttonWrapper.length).toBe(1)
    expect(props.onClose).toBeCalled()
  })
})
