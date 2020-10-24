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

import { getSizeDisplay, sizeConverter, FileSizes } from "./FileHelper"

describe("getSizeDisplay", () => {
  test("it shows unit", async () => {
    expect(getSizeDisplay(1024, FileSizes.Byte)).toEqual("1.0KB")
    expect(getSizeDisplay(1024 * 1024, FileSizes.Byte)).toEqual("1.0MB")
    expect(getSizeDisplay(1024 * 1024 * 1024, FileSizes.Byte)).toEqual("1.0GB")

    expect(getSizeDisplay(10, FileSizes.GigaByte)).toEqual("10.0GB")
    expect(getSizeDisplay(1024, FileSizes.MegaByte)).toEqual("1.0GB")
  })

  test("it has unusual values", async () => {
    expect(() => getSizeDisplay(-100, FileSizes.Byte)).toThrow(
      "Size must be greater than or equal to 0"
    )
    expect(getSizeDisplay(0, FileSizes.Byte, -1)).toEqual("0B")
  })

  test("it truncates to the right amount of decimals", async () => {
    expect(getSizeDisplay(1024, FileSizes.Byte)).toEqual("1.0KB")
    expect(getSizeDisplay(1024, FileSizes.Byte, 0)).toEqual("1KB")
    expect(getSizeDisplay(1024, FileSizes.Byte, 3)).toEqual("1.000KB")
  })

  test("it rounds up to the next unit", async () => {
    expect(getSizeDisplay(500, FileSizes.Byte)).toEqual("500.0B")
    expect(getSizeDisplay(800, FileSizes.Byte)).toEqual("0.8KB")
    expect(getSizeDisplay(501, FileSizes.GigaByte)).toEqual("501.0GB")
  })
})

describe("sizeConverter", () => {
  test("it converts up to the bigger unit", async () => {
    expect(sizeConverter(0.5, FileSizes.KiloByte, FileSizes.MegaByte)).toEqual(
      0.5 / 1024
    )
    expect(sizeConverter(1024, FileSizes.Byte, FileSizes.KiloByte)).toEqual(1)
    expect(
      sizeConverter(1024 ** 2, FileSizes.KiloByte, FileSizes.GigaByte)
    ).toEqual(1)
    expect(sizeConverter(1, FileSizes.MegaByte, FileSizes.GigaByte)).toEqual(
      1 / 1024
    )
  })

  test("it converts down to the smaller unit", async () => {
    expect(sizeConverter(0.5, FileSizes.GigaByte, FileSizes.MegaByte)).toEqual(
      512
    )
    expect(
      sizeConverter(1024, FileSizes.GigaByte, FileSizes.KiloByte)
    ).toEqual(1024 ** 3)
    expect(
      sizeConverter(1024 ** 2, FileSizes.MegaByte, FileSizes.KiloByte)
    ).toEqual(1024 ** 3)
    expect(sizeConverter(1, FileSizes.KiloByte, FileSizes.Byte)).toEqual(1024)
  })

  test("it handles unusual cases", async () => {
    expect(sizeConverter(1024, FileSizes.Byte, FileSizes.Byte)).toEqual(1024)
    expect(() =>
      sizeConverter(-1, FileSizes.GigaByte, FileSizes.GigaByte)
    ).toThrowError()
  })
})
