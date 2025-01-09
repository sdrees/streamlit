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

import React, { memo, useCallback, useEffect, useState } from "react"

import { isMobile } from "react-device-detect"
import { ChevronDown } from "baseui/icon"
import { OnChangeParams, Option, Select as UISelect } from "baseui/select"
import { useTheme } from "@emotion/react"
import { hasMatch, score } from "fzy.js"
import sortBy from "lodash/sortBy"

import VirtualDropdown from "@streamlit/lib/src/components/shared/Dropdown/VirtualDropdown"
import {
  isNullOrUndefined,
  LabelVisibilityOptions,
} from "@streamlit/lib/src/util/utils"
import { Placement } from "@streamlit/lib/src/components/shared/Tooltip"
import TooltipIcon from "@streamlit/lib/src/components/shared/TooltipIcon"
import {
  StyledWidgetLabelHelp,
  WidgetLabel,
} from "@streamlit/lib/src/components/widgets/BaseWidget"
import { EmotionTheme } from "@streamlit/lib/src/theme"

const NO_OPTIONS_MSG = "No options to select."

export interface Props {
  disabled: boolean
  width?: number
  value: number | null
  onChange: (value: number | null) => void
  options: any[]
  label?: string | null
  labelVisibility?: LabelVisibilityOptions
  help?: string
  placeholder?: string
  clearable?: boolean
}

interface SelectOption {
  label: string
  value: string
}

// Add a custom filterOptions method to filter options only based on labels.
// The baseweb default method filters based on labels or indices
// More details: https://github.com/streamlit/streamlit/issues/1010
// Also filters using fuzzy search powered by fzy.js. Automatically handles
// upper/lowercase.
export function fuzzyFilterSelectOptions(
  options: SelectOption[],
  pattern: string
): readonly SelectOption[] {
  if (!pattern) {
    return options
  }

  const filteredOptions = options.filter((opt: SelectOption) =>
    hasMatch(pattern, opt.label)
  )
  return sortBy(filteredOptions, (opt: SelectOption) =>
    score(pattern, opt.label)
  ).reverse()
}

const Selectbox: React.FC<Props> = ({
  disabled,
  width,
  value: propValue,
  onChange,
  options: propOptions,
  label,
  labelVisibility,
  help,
  placeholder,
  clearable,
}) => {
  const theme: EmotionTheme = useTheme()
  const [value, setValue] = useState<number | null>(propValue)

  // Update the value whenever the value provided by the props changes
  // TODO: Find a better way to handle this to prevent unneeded re-renders
  useEffect(() => {
    setValue(propValue)
  }, [propValue])

  const handleChange = useCallback(
    (params: OnChangeParams): void => {
      if (params.value.length === 0) {
        setValue(null)
        onChange(null)
        return
      }

      const [selected] = params.value
      const newValue = parseInt(selected.value, 10)
      setValue(newValue)
      onChange(newValue)
    },
    [onChange]
  )

  const filterOptions = useCallback(
    (options: readonly Option[], filterValue: string): readonly Option[] =>
      fuzzyFilterSelectOptions(options as SelectOption[], filterValue),
    []
  )

  let selectDisabled = disabled
  let options = propOptions

  let selectValue: Option[] = []

  if (!isNullOrUndefined(value)) {
    selectValue = [
      {
        label: options.length > 0 ? options[value] : NO_OPTIONS_MSG,
        value: value.toString(),
      },
    ]
  }

  if (options.length === 0) {
    options = [NO_OPTIONS_MSG]
    selectDisabled = true
  }

  const selectOptions: SelectOption[] = options.map(
    (option: string, index: number) => ({
      label: option,
      value: index.toString(),
    })
  )

  // Check if we have more than 10 options in the selectbox.
  // If that's true, we show the keyboard on mobile. If not, we hide it.
  const showKeyboardOnMobile = options.length > 10

  return (
    <div className="stSelectbox" data-testid="stSelectbox" style={{ width }}>
      <WidgetLabel
        label={label}
        labelVisibility={labelVisibility}
        disabled={selectDisabled}
      >
        {help && (
          <StyledWidgetLabelHelp>
            <TooltipIcon content={help} placement={Placement.TOP_RIGHT} />
          </StyledWidgetLabelHelp>
        )}
      </WidgetLabel>
      <UISelect
        disabled={selectDisabled}
        labelKey="label"
        aria-label={label || ""}
        onChange={handleChange}
        options={selectOptions}
        filterOptions={filterOptions}
        clearable={clearable || false}
        escapeClearsValue={clearable || false}
        value={selectValue}
        valueKey="value"
        placeholder={placeholder}
        overrides={{
          Root: {
            style: () => ({
              lineHeight: theme.lineHeights.inputWidget,
            }),
          },
          Dropdown: { component: VirtualDropdown },
          ClearIcon: {
            props: {
              overrides: {
                Svg: {
                  style: {
                    color: theme.colors.darkGray,
                    // Setting this width and height makes the clear-icon align with dropdown arrows
                    padding: theme.spacing.threeXS,
                    height: theme.sizes.clearIconSize,
                    width: theme.sizes.clearIconSize,
                    ":hover": {
                      fill: theme.colors.bodyText,
                    },
                  },
                },
              },
            },
          },
          ControlContainer: {
            style: () => ({
              height: theme.sizes.minElementHeight,
              // Baseweb requires long-hand props, short-hand leads to weird bugs & warnings.
              borderLeftWidth: theme.sizes.borderWidth,
              borderRightWidth: theme.sizes.borderWidth,
              borderTopWidth: theme.sizes.borderWidth,
              borderBottomWidth: theme.sizes.borderWidth,
            }),
          },
          IconsContainer: {
            style: () => ({
              paddingRight: theme.spacing.sm,
            }),
          },
          ValueContainer: {
            style: () => ({
              // Baseweb requires long-hand props, short-hand leads to weird bugs & warnings.
              paddingRight: theme.spacing.sm,
              paddingLeft: theme.spacing.sm,
              paddingBottom: theme.spacing.sm,
              paddingTop: theme.spacing.sm,
            }),
          },
          Input: {
            props: {
              // Change the 'readonly' prop to hide the mobile keyboard if options < 10
              readOnly: isMobile && !showKeyboardOnMobile ? "readonly" : null,
            },
            style: () => ({
              lineHeight: theme.lineHeights.inputWidget,
            }),
          },
          // Nudge the dropdown menu by 1px so the focus state doesn't get cut off
          Popover: {
            props: {
              overrides: {
                Body: {
                  style: () => ({
                    marginTop: theme.spacing.px,
                  }),
                },
              },
            },
          },
          SelectArrow: {
            component: ChevronDown,
            props: {
              overrides: {
                Svg: {
                  style: () => ({
                    width: theme.iconSizes.xl,
                    height: theme.iconSizes.xl,
                  }),
                },
              },
            },
          },
        }}
      />
    </div>
  )
}

export default memo(Selectbox)
