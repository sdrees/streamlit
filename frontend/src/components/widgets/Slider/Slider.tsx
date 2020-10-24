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
import { Slider as UISlider } from "baseui/slider"
import { sprintf } from "sprintf-js"
import { WidgetStateManager, Source } from "lib/WidgetStateManager"
import { Slider as SliderProto } from "autogen/proto"
import { sliderOverrides } from "lib/widgetTheme"
import { debounce } from "lib/utils"
import moment from "moment"

const DEBOUNCE_TIME_MS = 200

export interface Props {
  disabled: boolean
  element: SliderProto
  widgetMgr: WidgetStateManager
  width: number
}

interface State {
  /**
   * The value specified by the user via the UI. If the user didn't touch this
   * widget's UI, the default value is used.
   */
  value: number[]
}

class Slider extends React.PureComponent<Props, State> {
  public state: State

  private sliderRef = React.createRef<HTMLDivElement>()

  private readonly setWidgetValueDebounced: (source: Source) => void

  public constructor(props: Props) {
    super(props)
    this.setWidgetValueDebounced = debounce(
      DEBOUNCE_TIME_MS,
      this.setWidgetValueImmediately.bind(this)
    )
    this.state = { value: this.initialValue }
  }

  get initialValue(): number[] {
    const widgetId = this.props.element.id
    const storedValue = this.props.widgetMgr.getFloatArrayValue(widgetId)
    return storedValue !== undefined ? storedValue : this.props.element.default
  }

  public componentDidMount = (): void => {
    // Attach click event listener to slider knobs.
    this.getAllSliderRoles().forEach((knob, index) => {
      knob.addEventListener("click", this.handleClick)
      this.setAriaValueText(knob, index)
    })
    this.setWidgetValueImmediately({ fromUi: false })
  }

  public componentDidUpdate = (): void => {
    this.getAllSliderRoles().forEach((knob, index) => {
      this.setAriaValueText(knob, index)
    })
  }

  public componentWillUnmount = (): void => {
    // Remove click event listener from slider knobs.
    this.getAllSliderRoles().forEach(knob => {
      knob.removeEventListener("click", this.handleClick)
    })
  }

  private setWidgetValueImmediately = (source: Source): void => {
    const widgetId = this.props.element.id
    this.props.widgetMgr.setFloatArrayValue(widgetId, this.state.value, source)
  }

  private getAllSliderRoles = (): Element[] => {
    if (!this.sliderRef.current) {
      return []
    }

    const knobSelector = '[role="slider"]'
    const knobs = this.sliderRef.current.querySelectorAll(knobSelector)

    return Array.from(knobs)
  }

  private setAriaValueText = (sliderRoleRef: Element, index: number): void => {
    // Setting `aria-valuetext` helps screen readers read options and dates
    const { options } = this.props.element
    if (options.length > 0 || this.isDateTimeType()) {
      const { value } = this
      if (index < value.length) {
        sliderRoleRef.setAttribute(
          "aria-valuetext",
          this.formatValue(value[index])
        )
      }
    }
  }

  private handleChange = ({ value }: { value: number[] }): void => {
    this.setState({ value }, () =>
      this.setWidgetValueDebounced({ fromUi: true })
    )
  }

  private handleClick = (e: Event): void => {
    const knob = e.target as HTMLElement
    knob.focus()
  }

  /**
   * Return the value of the slider. This will either be an array with
   * one value (for a single value slider), or an array with two
   * values (for a range slider).
   */
  private get value(): number[] {
    const { min, max } = this.props.element
    const { value } = this.state
    let start = value[0]
    let end = value.length > 1 ? value[1] : value[0]
    // Adjust the value if it's out of bounds.
    if (start > end) {
      start = end
    }
    if (start < min) {
      start = min
    }
    if (start > max) {
      start = max
    }
    if (end < min) {
      end = min
    }
    if (end > max) {
      end = max
    }
    return value.length > 1 ? [start, end] : [start]
  }

  private isDateTimeType(): boolean {
    const { dataType } = this.props.element
    return (
      dataType === SliderProto.DataType.DATETIME ||
      dataType === SliderProto.DataType.DATE ||
      dataType === SliderProto.DataType.TIME
    )
  }

  private formatValue(value: number): string {
    const { format, options } = this.props.element
    if (this.isDateTimeType()) {
      // Python datetime uses microseconds, but JS & Moment uses milliseconds
      return moment(value / 1000).format(format)
    }

    if (options.length > 0) {
      return sprintf(format, options[value])
    }

    return sprintf(format, value)
  }

  private renderThumbValue = (data: {
    $thumbIndex: number
    $value: any
  }): JSX.Element => {
    const thumbValueStyle = sliderOverrides.ThumbValue.style({
      $disabled: this.props.disabled,
    }) as React.CSSProperties

    return (
      <div style={thumbValueStyle}>
        {this.formatValue(data.$value[data.$thumbIndex])}
      </div>
    )
  }

  private renderTickBar = (): JSX.Element => {
    const { max, min } = this.props.element
    const tickBarItemStyle = sliderOverrides.TickBarItem
      .style as React.CSSProperties

    return (
      <div className="sliderTickBar" style={sliderOverrides.TickBar.style}>
        <div className="tickBarMin" style={tickBarItemStyle}>
          {this.formatValue(min)}
        </div>
        <div className="tickBarMax" style={tickBarItemStyle}>
          {this.formatValue(max)}
        </div>
      </div>
    )
  }

  public render = (): React.ReactNode => {
    const style = { width: this.props.width }

    return (
      <div ref={this.sliderRef} className="Widget stSlider" style={style}>
        <label>{this.props.element.label}</label>
        <UISlider
          min={this.props.element.min}
          max={this.props.element.max}
          step={this.props.element.step}
          value={this.value}
          onChange={this.handleChange}
          disabled={this.props.disabled}
          overrides={{
            ...sliderOverrides,
            ThumbValue: this.renderThumbValue,
            TickBar: this.renderTickBar,
          }}
        />
      </div>
    )
  }
}

export default Slider
