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
import moment from "moment"
import { Datepicker as UIDatePicker } from "baseui/datepicker"
import { DateInput as DateInputProto } from "autogen/proto"
import { WidgetStateManager, Source } from "lib/WidgetStateManager"
import { datePickerOverrides } from "lib/widgetTheme"

export interface Props {
  disabled: boolean
  element: DateInputProto
  widgetMgr: WidgetStateManager
  width: number
}

interface State {
  /**
   * An array with start and end date specified by the user via the UI. If the user
   * didn't touch this widget's UI, the default value is used. End date is optional.
   */
  values: Date[]
  /**
   * Boolean to toggle between single-date picker and range date picker.
   */
  isRange: boolean
}

// Date format for communication (protobuf) support
const DATE_FORMAT = "YYYY/MM/DD"

class DateInput extends React.PureComponent<Props, State> {
  public state: State = {
    values: this.initialValue,
    isRange: this.props.element.isRange,
  }

  get initialValue(): Date[] {
    // If WidgetStateManager knew a value for this widget, initialize to that.
    // Otherwise, use the default value from the widget protobuf.
    const widgetId = this.props.element.id
    const storedValue = this.props.widgetMgr.getStringArrayValue(widgetId)
    const stringArray =
      storedValue !== undefined ? storedValue : this.props.element.default
    return stringArray.map((val: string) => new Date(val))
  }

  public componentDidMount(): void {
    this.setWidgetValue({ fromUi: false })
  }

  private setWidgetValue = (source: Source): void => {
    const widgetId = this.props.element.id

    this.props.widgetMgr.setStringArrayValue(
      widgetId,
      this.state.values.map((value: Date) =>
        moment(value as Date).format(DATE_FORMAT)
      ),
      source
    )
  }

  private handleChange = ({ date }: { date: Date | Date[] }): void => {
    this.setState({ values: Array.isArray(date) ? date : [date] }, () =>
      this.setWidgetValue({ fromUi: true })
    )
  }

  private getMaxDate = (): Date | undefined => {
    const { element } = this.props
    const maxDate = element.max

    return maxDate && maxDate.length > 0
      ? moment(maxDate, DATE_FORMAT).toDate()
      : undefined
  }

  public render = (): React.ReactNode => {
    const { width, element, disabled } = this.props
    const { values, isRange } = this.state

    const style = { width }
    const minDate = moment(element.min, DATE_FORMAT).toDate()
    const maxDate = this.getMaxDate()

    return (
      <div className="Widget stDateInput" style={style}>
        <label>{element.label}</label>
        <UIDatePicker
          formatString="yyyy/MM/dd"
          disabled={disabled}
          onChange={this.handleChange}
          overrides={datePickerOverrides}
          value={values}
          minDate={minDate}
          maxDate={maxDate}
          range={isRange}
        />
      </div>
    )
  }
}

export default DateInput
