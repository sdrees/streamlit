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

import nodeEmoji from "node-emoji"
import { buildMediaUri } from "lib/UriUtil"
import { toCodePoint } from "vendor/twemoji"

/**
 * Set the provided url/emoji as the page favicon.
 *
 * @param {string} favicon may be an image url, or an emoji like 🍕 or :pizza:
 */
export function handleFavicon(favicon: string): void {
  const emoji = extractEmoji(favicon)
  if (emoji) {
    // Find the corresponding Twitter emoji on the CDN.
    const codepoint = toCodePoint(emoji)
    const emojiUrl = `https://twemoji.maxcdn.com/2/72x72/${codepoint}.png`
    overwriteFavicon(emojiUrl)
  } else {
    overwriteFavicon(buildMediaUri(favicon))
  }
}

// Update the favicon in the DOM with the specified image.
function overwriteFavicon(imageUrl: string): void {
  const faviconElement: HTMLLinkElement | null = document.querySelector(
    "link[rel='shortcut icon']"
  )
  if (faviconElement) {
    faviconElement.href = imageUrl
  }
}

// Return the emoji if it exists, or empty string otherwise
function extractEmoji(maybeEmoji: string): string {
  if (nodeEmoji.hasEmoji(nodeEmoji.get(maybeEmoji))) {
    // Format: pizza or :pizza:
    // Since hasEmoji(':pizza:') == true, we must do this check first
    return nodeEmoji.get(maybeEmoji)
  }
  if (nodeEmoji.hasEmoji(maybeEmoji)) {
    // Format: 🍕
    return maybeEmoji
  }
  return ""
}
