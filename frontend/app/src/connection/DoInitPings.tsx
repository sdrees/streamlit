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

/**
 * Attempts to connect to the URIs in uriList (in round-robin fashion) and
 * retries forever until one of the URIs responds with 'ok'.
 * Returns a promise with the index of the URI that worked.
 */

import axios from "axios"
import { getLogger } from "loglevel"

import {
  CORS_ERROR_MESSAGE_DOCUMENTATION_LINK,
  HOST_CONFIG_PATH,
  PING_TIMEOUT_MS,
  SERVER_PING_PATH,
} from "@streamlit/app/src/connection/constants"
import { OnRetry } from "@streamlit/app/src/connection/types"
import { buildHttpUri, IHostConfigResponse } from "@streamlit/lib"

import "./promiseWithResolversPolyfill"

const log = getLogger("DoInitPings")

export function doInitPings(
  uriPartsList: URL[],
  minimumTimeoutMs: number,
  maximumTimeoutMs: number,
  retryCallback: OnRetry,
  onHostConfigResp: (resp: IHostConfigResponse) => void
): Promise<number> {
  const { promise, resolve } = Promise.withResolvers<number>()
  let totalTries = 0
  let uriNumber = 0

  // Hoist the connect() declaration.
  let connect = (): void => {}

  const retryImmediately = (): void => {
    uriNumber++
    if (uriNumber >= uriPartsList.length) {
      uriNumber = 0
    }

    connect()
  }

  const retry = (errorMarkdown: string): void => {
    // Adjust retry time by +- 20% to spread out load
    const jitter = Math.random() * 0.4 - 0.2
    // Exponential backoff to reduce load from health pings when experiencing
    // persistent failure. Starts at minimumTimeoutMs.
    const timeoutMs =
      totalTries === 1
        ? minimumTimeoutMs
        : minimumTimeoutMs * 2 ** (totalTries - 1) * (1 + jitter)
    const retryTimeout = Math.min(maximumTimeoutMs, timeoutMs)

    retryCallback(totalTries, errorMarkdown, retryTimeout)

    window.setTimeout(retryImmediately, retryTimeout)
  }

  const retryWhenTheresNoResponse = (): void => {
    const uriParts = uriPartsList[uriNumber]
    const uri = new URL(buildHttpUri(uriParts, ""))

    if (uri.hostname === "localhost") {
      const markdownMessage = `
Is Streamlit still running? If you accidentally stopped Streamlit, just restart it in your terminal:

\`\`\`bash
streamlit run yourscript.py
\`\`\`
      `
      retry(markdownMessage)
    } else {
      retry("Connection failed with status 0.")
    }
  }

  const retryWhenIsForbidden = (): void => {
    const forbiddenMessage = `Cannot connect to Streamlit (HTTP status: 403).

If you are trying to access a Streamlit app running on another server, this could be due to the app's [CORS](${CORS_ERROR_MESSAGE_DOCUMENTATION_LINK}) settings.`

    retry(forbiddenMessage)
  }

  connect = () => {
    const uriParts = uriPartsList[uriNumber]
    const healthzUri = buildHttpUri(uriParts, SERVER_PING_PATH)
    const hostConfigUri = buildHttpUri(uriParts, HOST_CONFIG_PATH)

    log.info(`Attempting to connect to ${healthzUri}.`)

    if (uriNumber === 0) {
      totalTries++
    }

    // We fire off requests to the server's healthz and host-config
    // endpoints in parallel to avoid having to wait on too many sequential
    // round trip network requests before we can try to establish a WebSocket
    // connection. Technically, it would have been possible to implement a
    // single "get server health and origins whitelist" endpoint, but we chose
    // not to do so as it's semantically cleaner to not give the healthcheck
    // endpoint additional responsibilities.
    Promise.all([
      axios.get(healthzUri, { timeout: PING_TIMEOUT_MS }),
      axios.get(hostConfigUri, { timeout: PING_TIMEOUT_MS }),
    ])
      .then(([_, hostConfigResp]) => {
        onHostConfigResp(hostConfigResp.data)
        resolve(uriNumber)
      })
      .catch(error => {
        if (error.code === "ECONNABORTED") {
          return retry("Connection timed out.")
        }

        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx

          const { data, status } = error.response

          if (status === /* NO RESPONSE */ 0) {
            return retryWhenTheresNoResponse()
          }
          if (status === 403) {
            return retryWhenIsForbidden()
          }
          return retry(
            `Connection failed with status ${status}, ` +
              `and response "${data}".`
          )
        }
        if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          return retryWhenTheresNoResponse()
        }
        // Something happened in setting up the request that triggered an Error
        return retry(error.message)
      })
  }

  connect()

  return promise
}
