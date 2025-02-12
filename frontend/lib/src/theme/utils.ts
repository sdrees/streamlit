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

import { getLuminance, parseToRgba, toHex, transparentize } from "color2k"
import cloneDeep from "lodash/cloneDeep"
import isObject from "lodash/isObject"
import merge from "lodash/merge"
import once from "lodash/once"
import { getLogger } from "loglevel"

import { CustomThemeConfig, ICustomThemeConfig } from "@streamlit/protobuf"
import { localStorageAvailable } from "@streamlit/utils"

import { CircularBuffer } from "~lib/components/shared/Profiler/CircularBuffer"
import {
  baseTheme,
  CachedTheme,
  darkTheme,
  EmotionTheme,
  lightTheme,
  ThemeConfig,
  ThemeSpacing,
} from "~lib/theme"
import { LocalStore } from "~lib/util/storageUtils"
import {
  isDarkThemeInQueryParams,
  isLightThemeInQueryParams,
  notNullOrUndefined,
} from "~lib/util/utils"

import { createBaseUiTheme } from "./createBaseUiTheme"
import {
  computeDerivedColors,
  createEmotionColors,
  DerivedColors,
} from "./getColors"
import { fonts } from "./primitives/typography"

export const AUTO_THEME_NAME = "Use system setting"
export const CUSTOM_THEME_NAME = "Custom Theme"

declare global {
  interface Window {
    __streamlit?: {
      LIGHT_THEME: ICustomThemeConfig
      DARK_THEME: ICustomThemeConfig
      ENABLE_RELOAD_BASED_ON_HARDCODED_STREAMLIT_VERSION?: boolean
    }
    __streamlit_profiles__?: Record<
      string,
      CircularBuffer<{
        phase: "mount" | "update" | "nested-update"
        actualDuration: number
        baseDuration: number
        startTime: number
        commitTime: number
      }>
    >
  }
}
const log = getLogger("theme:utils")

function mergeTheme(
  theme: ThemeConfig,
  injectedTheme: ICustomThemeConfig | undefined
): ThemeConfig {
  // We confirm the injectedTheme is a valid object before merging it
  // since the type makes assumption about the implementation of the
  // injected object.
  if (injectedTheme && isObject(injectedTheme)) {
    const themeConfigProto = new CustomThemeConfig(injectedTheme)
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    return createTheme(theme.name, themeConfigProto, theme)
  }

  return theme
}

export const getMergedLightTheme = once(() =>
  mergeTheme(lightTheme, window.__streamlit?.LIGHT_THEME)
)
export const getMergedDarkTheme = once(() =>
  mergeTheme(darkTheme, window.__streamlit?.DARK_THEME)
)

export const getSystemTheme = (): ThemeConfig => {
  return window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? getMergedDarkTheme()
    : getMergedLightTheme()
}

export const createAutoTheme = (): ThemeConfig => ({
  ...getSystemTheme(),
  name: AUTO_THEME_NAME,
})

// Update auto theme in case it has changed
export const createPresetThemes = (): ThemeConfig[] => [
  createAutoTheme(),
  getMergedLightTheme(),
  getMergedDarkTheme(),
]

export const isPresetTheme = (themeConfig: ThemeConfig): boolean => {
  const presetThemeNames = createPresetThemes().map((t: ThemeConfig) => t.name)
  return presetThemeNames.includes(themeConfig.name)
}

export const bgColorToBaseString = (bgColor?: string): string =>
  bgColor === undefined || getLuminance(bgColor) > 0.5 ? "light" : "dark"

export const isColor = (strColor: string): boolean => {
  const s = new Option().style
  s.color = strColor
  return s.color !== ""
}

const parseFont = (font: string): string => {
  // Try to map a short font family to our default
  // font families
  const fontMap: Record<string, string> = {
    "sans-serif": fonts.sansSerif,
    serif: fonts.serif,
    monospace: fonts.monospace,
  }
  const fontKey = font.toLowerCase().replaceAll(" ", "-")
  if (fontKey in fontMap) {
    return fontMap[font]
  }

  // If the font is not in the map, return the font as is:
  return font
}

export const createEmotionTheme = (
  themeInput: Partial<ICustomThemeConfig>,
  baseThemeConfig = baseTheme
): EmotionTheme => {
  const { colors, genericFonts } = baseThemeConfig.emotion
  const {
    baseFontSize,
    roundness,
    showBorderAroundInputs,
    bodyFont,
    codeFont,
    ...customColors
  } = themeInput

  const parsedColors = Object.entries(customColors).reduce(
    (colors: Record<string, string>, [key, color]) => {
      // @ts-expect-error
      if (isColor(color)) {
        // @ts-expect-error
        colors[key] = color
      } else if (isColor(`#${color}`)) {
        colors[key] = `#${color}`
      }
      return colors
    },
    {}
  )

  // TODO: create an enum for this. Updating everything if a
  // config option changes is a pain
  // Mapping from CustomThemeConfig to color primitives
  const {
    secondaryBackgroundColor: secondaryBg,
    backgroundColor: bgColor,
    primaryColor: primary,
    textColor: bodyText,
    widgetBorderColor,
    borderColor,
    linkColor,
  } = parsedColors

  const newGenericColors = { ...colors }

  if (primary) newGenericColors.primary = primary
  if (bodyText) newGenericColors.bodyText = bodyText
  if (secondaryBg) newGenericColors.secondaryBg = secondaryBg
  if (bgColor) newGenericColors.bgColor = bgColor
  if (linkColor) newGenericColors.link = linkColor

  // Secondary color is not yet configurable. Set secondary color to primary color
  // by default for all custom themes.
  newGenericColors.secondary = newGenericColors.primary

  const conditionalOverrides: any = {}

  conditionalOverrides.colors = createEmotionColors(newGenericColors)

  if (notNullOrUndefined(borderColor)) {
    conditionalOverrides.colors.borderColor = borderColor
    conditionalOverrides.colors.borderColorLight = transparentize(
      borderColor,
      0.55
    )
  }

  if (showBorderAroundInputs || widgetBorderColor) {
    // widgetBorderColor from the themeInput is deprecated. For compatibility
    // with older SiS theming, we still apply it here if provided, but we should
    // consider full removing it at some point.
    conditionalOverrides.colors.widgetBorderColor =
      widgetBorderColor || conditionalOverrides.colors.borderColor
  }

  if (notNullOrUndefined(roundness)) {
    conditionalOverrides.radii = {
      ...baseThemeConfig.emotion.radii,
    }

    // Normalize the roundness to be between 0 and 1.6rem base radii.
    // 1.6rem is chosen based on having our base widgets fully rounded (at 1.25rem)
    // and some additional roundness for which other elements still look good.
    // Also enforces that roundness is 0-1. Bigger values are capped at 1.
    // Smaller values are capped at 0.
    // We make sure that the value is rounded to 2 decimal places to avoid
    // floating point precision issues.
    const baseRadii = roundToTwoDecimals(
      Math.max(0, Math.min(roundness, 1)) * 1.6
    )
    conditionalOverrides.radii.default = addRemUnit(baseRadii)
    // Adapt all the other radii sizes based on the base radii:
    // But use some upper limits to prevent elements from looking weird:
    conditionalOverrides.radii.md = addRemUnit(
      roundToTwoDecimals(baseRadii * 0.5)
    )
    conditionalOverrides.radii.xl = addRemUnit(
      roundToTwoDecimals(baseRadii * 1.5)
    )
    conditionalOverrides.radii.xxl = addRemUnit(
      roundToTwoDecimals(baseRadii * 2)
    )
  }

  if (baseFontSize && baseFontSize > 0) {
    conditionalOverrides.fontSizes = {
      ...baseThemeConfig.emotion.fontSizes,
    }

    // Set the root font size to the configured value (used on global styles):
    conditionalOverrides.fontSizes.baseFontSize = baseFontSize
  }

  return {
    ...baseThemeConfig.emotion,
    colors: createEmotionColors(newGenericColors),
    genericFonts: {
      ...genericFonts,
      ...(bodyFont && {
        // We currently do not allow to set different fonts for body and heading
        // so we use the same font for both.
        bodyFont: parseFont(bodyFont),
        headingFont: parseFont(bodyFont),
      }),
      ...(codeFont && {
        codeFont: parseFont(codeFont),
      }),
    },
    ...conditionalOverrides,
  }
}

export const toThemeInput = (
  theme: EmotionTheme
): Partial<CustomThemeConfig> => {
  const { colors } = theme
  return {
    primaryColor: colors.primary,
    backgroundColor: colors.bgColor,
    secondaryBackgroundColor: colors.secondaryBg,
    textColor: colors.bodyText,
  }
}

export type ExportedTheme = {
  base: string
  primaryColor: string
  backgroundColor: string
  secondaryBackgroundColor: string
  textColor: string
} & DerivedColors

export const toExportedTheme = (theme: EmotionTheme): ExportedTheme => {
  const { colors } = theme
  const themeInput = toThemeInput(theme)

  // At this point, we know that all of the fields of themeInput are populated
  // (since we went "backwards" from a theme -> themeInput), but typescript
  // doesn't know this, so we have to cast each field to string.
  return {
    primaryColor: themeInput.primaryColor as string,
    backgroundColor: themeInput.backgroundColor as string,
    secondaryBackgroundColor: themeInput.secondaryBackgroundColor as string,
    textColor: themeInput.textColor as string,

    base: bgColorToBaseString(themeInput.backgroundColor),

    ...computeDerivedColors(colors),
  }
}

const completeThemeInput = (
  partialInput: Partial<CustomThemeConfig>,
  baseTheme: ThemeConfig
): CustomThemeConfig => {
  return new CustomThemeConfig({
    ...toThemeInput(baseTheme.emotion),
    ...partialInput,
  })
}

export const createTheme = (
  themeName: string,
  themeInput: Partial<CustomThemeConfig>,
  baseThemeConfig?: ThemeConfig,
  inSidebar = false
): ThemeConfig => {
  let completedThemeInput: CustomThemeConfig

  if (baseThemeConfig) {
    completedThemeInput = completeThemeInput(themeInput, baseThemeConfig)
  } else if (themeInput.base === CustomThemeConfig.BaseTheme.DARK) {
    completedThemeInput = completeThemeInput(themeInput, darkTheme)
  } else {
    completedThemeInput = completeThemeInput(themeInput, lightTheme)
  }

  // We use startingTheme to pick a set of "auxiliary colors" for widgets like
  // the success/info/warning/error boxes and others; these need to have their
  // colors tweaked to work well with the background.
  //
  // For our auxiliary colors, we pick colors that look reasonable based on the
  // theme's backgroundColor instead of picking them using themeInput.base.
  // This way, things will look good even if a user sets
  // themeInput.base === LIGHT and themeInput.backgroundColor === "black".
  const bgColor = completedThemeInput.backgroundColor as string
  const startingTheme = merge(
    cloneDeep(
      baseThemeConfig
        ? baseThemeConfig
        : getLuminance(bgColor) > 0.5
        ? lightTheme
        : darkTheme
    ),
    { emotion: { inSidebar } }
  )

  const emotion = createEmotionTheme(completedThemeInput, startingTheme)

  return {
    ...startingTheme,
    name: themeName,
    emotion,
    basewebTheme: createBaseUiTheme(emotion, startingTheme.primitives),
    themeInput,
  }
}

export const getCachedTheme = (): ThemeConfig | null => {
  if (!localStorageAvailable()) {
    return null
  }

  const cachedThemeStr = window.localStorage.getItem(LocalStore.ACTIVE_THEME)
  if (!cachedThemeStr) {
    return null
  }

  const { name: themeName, themeInput }: CachedTheme =
    JSON.parse(cachedThemeStr)
  switch (themeName) {
    case lightTheme.name:
      return getMergedLightTheme()
    case darkTheme.name:
      return getMergedDarkTheme()
    default:
      // At this point we're guaranteed that themeInput is defined.
      return createTheme(themeName, themeInput as Partial<CustomThemeConfig>)
  }
}

const deleteOldCachedThemes = (): void => {
  const { CACHED_THEME_VERSION, CACHED_THEME_BASE_KEY } = LocalStore
  const { localStorage } = window

  // Pre-release versions of theming stored cached themes under the key
  // "stActiveTheme".
  localStorage.removeItem("stActiveTheme")

  // The first version of cached themes had keys of the form
  // `stActiveTheme-${window.location.pathname}` with no version number.
  localStorage.removeItem(CACHED_THEME_BASE_KEY)

  for (let i = 1; i <= CACHED_THEME_VERSION; i++) {
    localStorage.removeItem(`${CACHED_THEME_BASE_KEY}-v${i}`)
  }
}

export const setCachedTheme = (themeConfig: ThemeConfig): void => {
  if (!localStorageAvailable()) {
    return
  }

  deleteOldCachedThemes()

  // Do not set the theme if the app has a pre-defined theme from the embedder
  if (isLightThemeInQueryParams() || isDarkThemeInQueryParams()) {
    return
  }

  const cachedTheme: CachedTheme = {
    name: themeConfig.name,
    ...(!isPresetTheme(themeConfig) && {
      themeInput: toThemeInput(themeConfig.emotion),
    }),
  }

  window.localStorage.setItem(
    LocalStore.ACTIVE_THEME,
    JSON.stringify(cachedTheme)
  )
}

export const removeCachedTheme = (): void => {
  if (!localStorageAvailable()) {
    return
  }

  window.localStorage.removeItem(LocalStore.ACTIVE_THEME)
}

export const getHostSpecifiedTheme = (): ThemeConfig => {
  if (isLightThemeInQueryParams()) {
    return getMergedLightTheme()
  }

  if (isDarkThemeInQueryParams()) {
    return getMergedDarkTheme()
  }

  return createAutoTheme()
}

export const getDefaultTheme = (): ThemeConfig => {
  // Priority for default theme
  const cachedTheme = getCachedTheme()

  // We shouldn't ever have auto saved in our storage in case
  // OS theme changes but we explicitly check in case!
  if (cachedTheme && cachedTheme.name !== AUTO_THEME_NAME) {
    return cachedTheme
  }

  return getHostSpecifiedTheme()
}

const whiteSpace = /\s+/
export function computeSpacingStyle(
  value: string,
  theme: EmotionTheme
): string {
  if (value === "") {
    return ""
  }

  return value
    .split(whiteSpace)
    .map(marginValue => {
      if (marginValue === "0") {
        return theme.spacing.none
      }

      if (!(marginValue in theme.spacing)) {
        log.error(`Invalid spacing value: ${marginValue}`)
        return theme.spacing.none
      }

      return theme.spacing[marginValue as ThemeSpacing]
    })
    .join(" ")
}

function addRemUnit(n: number): string {
  return `${n}rem`
}

function roundToTwoDecimals(n: number): number {
  return parseFloat(n.toFixed(2))
}

export function blend(color: string, background: string | undefined): string {
  if (background === undefined) return color
  const [r, g, b, a] = parseToRgba(color)
  if (a === 1) return color
  const [br, bg, bb, ba] = parseToRgba(background)
  const ao = a + ba * (1 - a)
  // (xaA + xaB·(1−aA))/aR
  const ro = Math.round((a * r + ba * br * (1 - a)) / ao)
  const go = Math.round((a * g + ba * bg * (1 - a)) / ao)
  const bo = Math.round((a * b + ba * bb * (1 - a)) / ao)
  return toHex(`rgba(${ro}, ${go}, ${bo}, ${ao})`)
}

/**
 * Convert a SCSS rem value to pixels.
 * @param scssValue: a string containing a value in rem units with or without the "rem" unit suffix
 * @returns pixel value of the given rem value
 */
export const convertRemToPx = (scssValue: string): number => {
  const remValue = parseFloat(scssValue.replace(/rem$/, ""))
  return (
    // TODO(lukasmasuch): We might want to somehow cache this value at some point.
    // However, I did experimented with the performance of calling this, and
    // it seems not like a big deal to call it many times.
    remValue *
    // We fallback to 16px if the fontSize is not defined (should only happen in tests)
    (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16)
  )
}
