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

import React, { ReactElement } from "react"

import { Check } from "@emotion-icons/material-outlined"

import {
  BaseButton,
  BaseButtonKind,
  BaseColorPicker,
  createTheme,
  CUSTOM_THEME_NAME,
  Icon,
  LibContext,
  Modal,
  ModalBody,
  ModalHeader,
  StreamlitMarkdown,
  ThemeConfig,
  toThemeInput,
} from "@streamlit/lib"
import { MetricsManager } from "@streamlit/app/src/MetricsManager"
import {
  themeBuilder,
  toMinimalToml,
} from "@streamlit/app/src/components/StreamlitDialog/themeUtils"

import {
  StyledBackButton,
  StyledDialogBody,
  StyledFullRow,
} from "./styled-components"

export interface Props {
  backToSettings: (animateModal: boolean) => void
  onClose: () => void
  metricsMgr: MetricsManager
}

const ThemeCreatorDialog = (props: Props): ReactElement => {
  const [copied, updateCopied] = React.useState(false)
  const { activeTheme, addThemes, setTheme } = React.useContext(LibContext)

  const themeInput = toThemeInput(activeTheme.emotion)

  const updateTheme = (customTheme: ThemeConfig): void => {
    addThemes([customTheme])
    setTheme(customTheme)
  }

  const onThemeOptionChange = (key: string, newVal: string): void => {
    const customTheme = createTheme(CUSTOM_THEME_NAME, {
      ...themeInput,
      [key]: newVal,
    })
    updateTheme(customTheme)
    updateCopied(false)
  }

  const config = toMinimalToml(themeInput)

  const copyConfig = (): void => {
    props.metricsMgr.enqueue("menuClick", {
      label: "copyThemeToClipboard",
    })
    navigator.clipboard.writeText(config)
    updateCopied(true)
  }

  const ThemeOption = ({
    name,
    value,
  }: {
    name: string
    value: string
  }): ReactElement | null => {
    const themeOptionConfig = themeBuilder[name]
    const isColor = themeOptionConfig.component === BaseColorPicker
    // Props that vary based on component type
    const variableProps = {
      options: themeOptionConfig.options || undefined,
      showValue: isColor,
      value: themeOptionConfig.getValue(value, themeOptionConfig),
    }
    return (
      <React.Fragment key={name}>
        <themeOptionConfig.component
          disabled={false}
          label={themeOptionConfig.title}
          help={themeOptionConfig.help}
          onChange={(newVal: string) => {
            onThemeOptionChange(name, newVal)
          }}
          {...variableProps}
        />
      </React.Fragment>
    )
  }

  const onClickedBack = (): void => {
    // Disable the modal animation when returning to the settings dialog so
    // that it looks like a page transition instead of the modal
    // appearing/disappearing rapidly.
    props.backToSettings(false)
  }

  // At this point, we're guaranteed to have themeInput be a fully populated
  // CustomThemeConfig.
  const {
    primaryColor,
    textColor,
    backgroundColor,
    secondaryBackgroundColor,
  } = themeInput as {
    primaryColor: string
    textColor: string
    backgroundColor: string
    secondaryBackgroundColor: string
  }

  return (
    <Modal animate={false} isOpen onClose={props.onClose}>
      <ModalHeader>
        <StyledBackButton
          onClick={onClickedBack}
          data-testid="stThemeCreatorBack"
        />
        Edit active theme
      </ModalHeader>
      <ModalBody>
        <StyledDialogBody data-testid="stThemeCreatorDialog">
          <StyledFullRow>
            <StreamlitMarkdown
              source={`
Changes made to the active theme will exist for the duration of a
session. To discard changes and recover the original theme,
refresh the page.`}
              allowHTML={false}
              isCaption={true}
            />
          </StyledFullRow>

          <ThemeOption name="primaryColor" value={primaryColor} />
          <ThemeOption name="backgroundColor" value={backgroundColor} />
          <ThemeOption name="textColor" value={textColor} />
          <ThemeOption
            name="secondaryBackgroundColor"
            value={secondaryBackgroundColor}
          />

          <StyledFullRow>
            <StyledFullRow>
              <StreamlitMarkdown
                source={`
To save your changes, copy your custom theme into the clipboard and paste it into the
\`[theme]\` section of your \`.streamlit/config.toml\` file.
`}
                allowHTML={false}
                isCaption={true}
              />
            </StyledFullRow>
          </StyledFullRow>

          <StyledFullRow>
            <div>
              <BaseButton onClick={copyConfig} kind={BaseButtonKind.SECONDARY}>
                {copied ? (
                  <React.Fragment>
                    {"Copied to clipboard "}
                    <Icon
                      content={Check}
                      size="lg"
                      color={activeTheme.emotion.colors.success}
                    />
                  </React.Fragment>
                ) : (
                  "Copy theme to clipboard"
                )}
              </BaseButton>
            </div>
          </StyledFullRow>
        </StyledDialogBody>
      </ModalBody>
    </Modal>
  )
}

export default ThemeCreatorDialog
