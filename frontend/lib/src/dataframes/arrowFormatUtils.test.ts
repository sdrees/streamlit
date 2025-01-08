/**
 * Copyright (c) Streamlit Inc. (2018-2022) Snowflake Inc. (2022-2024)
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

import { Field, Timestamp, TimeUnit, vectorFromArray } from "apache-arrow"

import { Quiver } from "@streamlit/lib/src/dataframes/Quiver"
import {
  DECIMAL,
  DICTIONARY,
  INT64,
  INTERVAL_DATETIME64,
  INTERVAL_FLOAT64,
  INTERVAL_INT64,
  INTERVAL_UINT64,
  PERIOD,
  TIMEDELTA,
  UINT64,
} from "@streamlit/lib/src/mocks/arrow"

import {
  convertTimeToDate,
  format,
  formatPeriodFromFreq,
} from "./arrowFormatUtils"

describe("format", () => {
  test("null", () => {
    expect(format(null)).toEqual("<NA>")
  })

  test("string", () => {
    expect(format("foo")).toEqual("foo")
  })

  test("boolean", () => {
    expect(format(true)).toEqual("true")
  })

  test("float64", () => {
    expect(
      format(1.25, {
        pandas_type: "float64",
        numpy_type: "float64",
      })
    ).toEqual("1.2500")
  })

  test("int64", () => {
    const mockElement = { data: INT64 }
    const q = new Quiver(mockElement)
    const { content } = q.getCell(1, 2)

    expect(
      format(content, {
        pandas_type: "int64",
        numpy_type: "int64",
      })
    ).toEqual("1")
  })

  test("uint64", () => {
    const mockElement = { data: UINT64 }
    const q = new Quiver(mockElement)
    const { content } = q.getCell(1, 2)

    expect(
      format(content, {
        pandas_type: "uint64",
        numpy_type: "uint64",
      })
    ).toEqual("2")
  })

  test("bytes", () => {
    expect(
      format(new Uint8Array([1, 2, 3]), {
        pandas_type: "bytes",
        numpy_type: "bytes",
      })
    ).toEqual("1,2,3")
  })

  test("date", () => {
    expect(
      format(new Date(Date.UTC(1970, 0, 1)), {
        pandas_type: "date",
        numpy_type: "object",
      })
    ).toEqual("1970-01-01")
  })

  test("datetime", () => {
    expect(
      format(
        0,
        {
          pandas_type: "datetime",
          numpy_type: "datetime64[ns]",
        },
        new Field("test", new Timestamp(TimeUnit.SECOND), true, null)
      )
    ).toEqual("1970-01-01 00:00:00")
  })

  test("datetimetz", () => {
    expect(
      format(
        0,
        {
          pandas_type: "datetimetz",
          numpy_type: "datetime64[ns]",
        },
        new Field(
          "test",
          new Timestamp(TimeUnit.SECOND, "Europe/Moscow"),
          true,
          null
        )
      )
    ).toEqual("1970-01-01 03:00:00+03:00")
  })

  test("datetimetz with offset", () => {
    expect(
      format(
        0,
        {
          pandas_type: "datetimetz",
          numpy_type: "datetime64[ns]",
        },
        new Field("test", new Timestamp(TimeUnit.SECOND, "+01:00"), true, null)
      )
    ).toEqual("1970-01-01 01:00:00+01:00")
  })

  test("interval datetime64[ns]", () => {
    const mockElement = { data: INTERVAL_DATETIME64 }
    const q = new Quiver(mockElement)
    const { content, contentType, field } = q.getCell(1, 0)

    expect(format(content, contentType, field)).toEqual(
      "(2017-01-01 00:00:00, 2017-01-02 00:00:00]"
    )
  })

  test("interval float64", () => {
    const mockElement = { data: INTERVAL_FLOAT64 }
    const q = new Quiver(mockElement)
    const { content, contentType, field } = q.getCell(1, 0)

    expect(format(content, contentType, field)).toEqual("(0.0000, 1.5000]")
  })

  test("interval int64", () => {
    const mockElement = { data: INTERVAL_INT64 }
    const q = new Quiver(mockElement)
    const { content, field } = q.getCell(1, 0)

    expect(
      format(
        content,
        {
          pandas_type: "object",
          numpy_type: "interval[int64, right]",
        },
        field
      )
    ).toEqual("(0, 1]")
  })

  test("interval uint64", () => {
    const mockElement = { data: INTERVAL_UINT64 }
    const q = new Quiver(mockElement)
    const { content, contentType, field } = q.getCell(1, 0)

    expect(format(content, contentType, field)).toEqual("(0, 1]")
  })

  test("decimal", () => {
    const mockElement = { data: DECIMAL }
    const q = new Quiver(mockElement)
    const cell1 = q.getCell(1, 1)
    expect(format(cell1.content, cell1.contentType, cell1.field)).toEqual(
      "1.1"
    )

    const cell2 = q.getCell(2, 1)
    expect(format(cell2.content, cell2.contentType, cell2.field)).toEqual(
      "10000"
    )

    const cell3 = q.getCell(1, 2)
    expect(format(cell3.content, cell3.contentType, cell3.field)).toEqual(
      "2.23"
    )

    const cell4 = q.getCell(2, 2)
    expect(format(cell4.content, cell4.contentType, cell4.field)).toEqual(
      "-0.1"
    )
  })

  test("timedelta", () => {
    const mockElement = { data: TIMEDELTA }
    const q = new Quiver(mockElement)
    const cell1 = q.getCell(1, 1)
    expect(format(cell1.content, cell1.contentType, cell1.field)).toEqual(
      "a few seconds"
    )

    const cell2 = q.getCell(2, 1)
    expect(format(cell2.content, cell2.contentType, cell2.field)).toEqual(
      "4 hours"
    )

    const cell3 = q.getCell(1, 2)
    expect(format(cell3.content, cell3.contentType, cell3.field)).toEqual(
      "20 days"
    )

    const cell4 = q.getCell(2, 2)
    expect(format(cell4.content, cell4.contentType, cell4.field)).toEqual(
      "2 hours"
    )
  })

  test("dictionary", () => {
    const mockElement = { data: DICTIONARY }
    const q = new Quiver(mockElement)
    const { content, contentType, field } = q.getCell(1, 1)
    expect(format(content, contentType, field)).toEqual(`{"a":1,"b":2}`)
  })

  test("period", () => {
    const mockElement = { data: PERIOD }
    const q = new Quiver(mockElement)
    const { rows, columns } = q.dimensions
    const table: Record<string, string[]> = {}
    for (let columnIndex = 1; columnIndex < columns; columnIndex++) {
      const column = []
      for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
        const { content, contentType, field } = q.getCell(
          rowIndex,
          columnIndex
        )
        const cellValue = format(content, contentType, field)
        column.push(cellValue)
      }
      table[column[0]] = [column[1], column[2]]
    }

    expect(table).toEqual({
      A: ["2012", "1970"],
      M: ["2012-02", "1970-01"],
      Y: ["2012", "1970"],
      h: ["2012-02-14 00:00", "1970-01-01 00:00"],
      min: ["2012-02-14 00:00", "1970-01-01 00:00"],
      ms: ["2012-02-14 00:00:00.000", "1970-01-01 00:00:00.000"],
      s: ["2012-02-14 00:00:00", "1970-01-01 00:00:00"],
      L: ["2012-02-14 00:00:00.000", "1970-01-01 00:00:00.000"],
      S: ["2012-02-14 00:00:00", "1970-01-01 00:00:00"],
      T: ["2012-02-14 00:00", "1970-01-01 00:00"],
      H: ["2012-02-14 00:00", "1970-01-01 00:00"],
      D: ["2012-02-14", "1970-01-01"],
      W: ["2012-02-13/2012-02-19", "1969-12-29/1970-01-04"],
      "W-SUN": ["2012-02-13/2012-02-19", "1969-12-29/1970-01-04"],
      "W-MON": ["2012-02-14/2012-02-20", "1969-12-30/1970-01-05"],
      "W-TUE": ["2012-02-08/2012-02-14", "1969-12-31/1970-01-06"],
      "W-WED": ["2012-02-09/2012-02-15", "1970-01-01/1970-01-07"],
      "W-THU": ["2012-02-10/2012-02-16", "1969-12-26/1970-01-01"],
      "W-FRI": ["2012-02-11/2012-02-17", "1969-12-27/1970-01-02"],
      "W-SAT": ["2012-02-12/2012-02-18", "1969-12-28/1970-01-03"],
      Q: ["2012Q1", "1970Q1"],
      "Q-JAN": ["2013Q1", "1970Q4"],
      "Q-FEB": ["2012Q4", "1970Q4"],
      "Q-MAR": ["2012Q4", "1970Q4"],
      "Q-APR": ["2012Q4", "1970Q3"],
      "Q-MAY": ["2012Q3", "1970Q3"],
      "Q-JUN": ["2012Q3", "1970Q3"],
      "Q-JUL": ["2012Q3", "1970Q2"],
      "Q-AUG": ["2012Q2", "1970Q2"],
      "Q-SEP": ["2012Q2", "1970Q2"],
      "Q-OCT": ["2012Q2", "1970Q1"],
      "Q-NOV": ["2012Q1", "1970Q1"],
      "Q-DEC": ["2012Q1", "1970Q1"],
    })
  })

  test("list[unicode]", () => {
    expect(
      format(vectorFromArray(["foo", "bar", "baz"]), {
        pandas_type: "list[unicode]",
        numpy_type: "object",
      })
    ).toEqual('["foo","bar","baz"]')
  })
})

describe("formatPeriodFromFreq", () => {
  it.each([
    // Basic frequencies
    [1, "Y", "1971"],
    [1, "M", "1970-02"],
    [1, "D", "1970-01-02"],
    [1, "h", "1970-01-01 01:00"],
    [1, "min", "1970-01-01 00:01"],
    [1, "s", "1970-01-01 00:00:01"],
    [1, "ms", "1970-01-01 00:00:00.001"],
    // Weekly frequencies
    [1, "W-MON", "1969-12-30/1970-01-05"],
    [1, "W-TUE", "1969-12-31/1970-01-06"],
    [1, "W-WED", "1970-01-01/1970-01-07"],
    [1, "W-THU", "1970-01-02/1970-01-08"],
    [1, "W-FRI", "1970-01-03/1970-01-09"],
    [1, "W-SAT", "1970-01-04/1970-01-10"],
    [1, "W-SUN", "1969-12-29/1970-01-04"],
    // Invalid frequencies
    [1, "invalid", "1"],
  ])("formats %s with frequency %s to %s", (value, freq, expected) => {
    expect(formatPeriodFromFreq(value, freq as any)).toEqual(expected)
  })

  test("handles weekly frequency without parameter", () => {
    expect(() => formatPeriodFromFreq(1, "W")).toThrow(
      'Frequency "W" requires parameter'
    )
  })

  test("handles weekly frequency with invalid parameter", () => {
    expect(() => formatPeriodFromFreq(1, "W-INVALID")).toThrow(
      'Invalid value: INVALID. Supported values: ["SUN","MON","TUE","WED","THU","FRI","SAT"]'
    )
  })
})

describe("convertTimestampToDate", () => {
  test.each([
    // [timestamp, unit, expected date string]
    [1000, TimeUnit.SECOND, "1970-01-01T00:16:40.000Z"],
    [1000, TimeUnit.MILLISECOND, "1970-01-01T00:00:01.000Z"],
    [1000, TimeUnit.MICROSECOND, "1970-01-01T00:00:00.001Z"],
    [1000, TimeUnit.NANOSECOND, "1970-01-01T00:00:00.000Z"],
    // Test with BigInt values
    [BigInt(1000), TimeUnit.SECOND, "1970-01-01T00:16:40.000Z"],
    [BigInt(1000), TimeUnit.MILLISECOND, "1970-01-01T00:00:01.000Z"],
    // Test with undefined field (should default to SECOND)
    [1000, undefined, "1970-01-01T00:16:40.000Z"],
    // Test with large timestamps
    [1647356400, TimeUnit.SECOND, "2022-03-15T15:00:00.000Z"],
    [1647356400000, TimeUnit.MILLISECOND, "2022-03-15T15:00:00.000Z"],
  ])("converts time %s with unit %s to %s", (timestamp, unit, expected) => {
    const result = convertTimeToDate(
      timestamp,
      unit ? new Field("test", new Timestamp(unit), true, null) : undefined
    )
    expect(result.toISOString()).toBe(expected)
  })
})
