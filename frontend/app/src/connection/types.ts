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

import { ConnectionState } from "@streamlit/app/src/connection/ConnectionState"

export type OnMessage = (ForwardMsg: any) => void

export type OnConnectionStateChange = (
  connectionState: ConnectionState,
  errMsg?: string
) => void

export type OnRetry = (
  totalTries: number,
  errorMarkdown: string,
  retryTimeout: number
) => void

export type Event =
  | "INITIALIZED"
  | "CONNECTION_CLOSED"
  | "CONNECTION_ERROR"
  | "CONNECTION_SUCCEEDED"
  | "CONNECTION_TIMED_OUT"
  | "SERVER_PING_SUCCEEDED"
  | "FATAL_ERROR" // Unrecoverable error. This should never happen!
