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

import { buildHttpUri } from "@streamlit/utils"

import {
  buildWsUri,
  getPossibleBaseUris,
  getWindowBaseUriParts,
} from "./utils"

const location: Partial<Location> = {}

global.window = Object.create(window)
Object.defineProperty(window, "location", { value: location })

test("gets all window URI parts", () => {
  location.href = "https://the_host:9988/foo"

  const { hostname, port, pathname } = getWindowBaseUriParts()
  expect(hostname).toBe("the_host")
  expect(port).toBe("9988")
  expect(pathname).toBe("/foo")
})

test("gets window URI parts without basePath", () => {
  location.href = "https://the_host:9988"

  const parts = getWindowBaseUriParts()
  expect(parts).toMatchObject({
    hostname: "the_host",
    port: "9988",
    pathname: "/",
  })
})

test("gets window URI parts with long basePath", () => {
  location.href = "https://the_host:9988/foo/bar"

  const { hostname, port, pathname } = getWindowBaseUriParts()
  expect(hostname).toBe("the_host")
  expect(port).toBe("9988")
  expect(pathname).toBe("/foo/bar")
})

test("gets window URI parts with weird basePath", () => {
  location.href = "https://the_host:9988///foo/bar//"

  const { hostname, port, pathname } = getWindowBaseUriParts()
  expect(hostname).toBe("the_host")
  expect(port).toBe("9988")
  expect(pathname).toBe("/foo/bar")
})

test("builds HTTP URI correctly", () => {
  location.href = "http://something"
  const uri = buildHttpUri(
    {
      hostname: "the_host",
      port: "9988",
      pathname: "foo/bar",
    } as URL,
    "baz"
  )
  expect(uri).toBe("http://the_host:9988/foo/bar/baz")
})

test("builds HTTPS URI correctly", () => {
  location.href = "https://something"
  const uri = buildHttpUri(
    {
      hostname: "the_host",
      port: "9988",
      pathname: "foo/bar",
    } as URL,
    "baz"
  )
  expect(uri).toBe("https://the_host:9988/foo/bar/baz")
})

test("builds HTTP URI with no base path", () => {
  location.href = "http://something"
  const uri = buildHttpUri(
    {
      hostname: "the_host",
      port: "9988",
      pathname: "",
    } as URL,
    "baz"
  )
  expect(uri).toBe("http://the_host:9988/baz")
})

test("builds WS URI correctly", () => {
  location.href = "http://something"
  const uri = buildWsUri(
    {
      hostname: "the_host",
      port: "9988",
      pathname: "foo/bar",
    } as URL,
    "baz"
  )
  expect(uri).toBe("ws://the_host:9988/foo/bar/baz")
})

test("builds WSS URI correctly", () => {
  location.href = "https://something"
  const uri = buildWsUri(
    {
      hostname: "the_host",
      port: "9988",
      pathname: "foo/bar",
    } as URL,
    "baz"
  )
  expect(uri).toBe("wss://the_host:9988/foo/bar/baz")
})

test("builds WS URI with no base path", () => {
  location.href = "http://something"
  const uri = buildWsUri(
    {
      hostname: "the_host",
      port: "9988",
      pathname: "",
    } as URL,
    "baz"
  )
  expect(uri).toBe("ws://the_host:9988/baz")
})

describe("getPossibleBaseUris", () => {
  let originalPathName = ""

  beforeEach(() => {
    originalPathName = window.location.pathname
  })

  afterEach(() => {
    window.location.pathname = originalPathName
  })

  const testCases = [
    {
      description: "empty pathnames",
      pathname: "/",
      expectedBasePaths: ["/"],
    },
    {
      description: "pathnames with a single part",
      pathname: "/foo",
      expectedBasePaths: ["/foo", "/"],
    },
    {
      description: "pathnames with two parts",
      pathname: "/foo/bar",
      expectedBasePaths: ["/foo/bar", "/foo"],
    },
    {
      description: "pathnames with more than two parts",
      pathname: "/foo/bar/baz/qux",
      expectedBasePaths: ["/foo/bar/baz/qux", "/foo/bar/baz"],
    },
  ]

  testCases.forEach(({ description, pathname, expectedBasePaths }) => {
    it(`handles ${description}`, () => {
      window.location.href = `https://not_a_host:80${pathname}`

      expect(getPossibleBaseUris().map(b => b.pathname)).toEqual(
        expectedBasePaths
      )
    })
  })
})
