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

import { Quiver } from "@streamlit/lib/src/dataframes/Quiver"
import {
  CATEGORICAL,
  DATE,
  DECIMAL,
  DICTIONARY,
  FLOAT64,
  INT64,
  INTERVAL_DATETIME64,
  INTERVAL_FLOAT64,
  INTERVAL_INT64,
  INTERVAL_UINT64,
  PERIOD,
  RANGE,
  TIMEDELTA,
  UINT64,
  UNICODE,
} from "@streamlit/lib/src/mocks/arrow"

import {
  getTimezone,
  getTypeName,
  IndexTypeName,
  isBooleanType,
  isDecimalType,
  isFloatType,
  isIntegerType,
  isNumericType,
  isUnsignedIntegerType,
  Type,
} from "./arrowTypeUtils"

describe("getTypeName", () => {
  describe("uses numpy_type", () => {
    test("period", () => {
      const mockElement = { data: PERIOD }
      const q = new Quiver(mockElement)
      const dataType = q.types.data[0]

      expect(getTypeName(dataType)).toEqual("period[Y-DEC]")
    })

    test("decimal", () => {
      const mockElement = { data: DECIMAL }
      const q = new Quiver(mockElement)
      const firstColumnType = q.types.data[0]

      expect(getTypeName(firstColumnType)).toEqual("decimal")
    })

    test("timedelta", () => {
      const mockElement = { data: TIMEDELTA }
      const q = new Quiver(mockElement)
      const firstColumnType = q.types.data[0]

      expect(getTypeName(firstColumnType)).toEqual("timedelta64[ns]")
    })

    test("dictionary", () => {
      const mockElement = { data: DICTIONARY }
      const q = new Quiver(mockElement)
      const firstColumnType = q.types.data[0]

      expect(getTypeName(firstColumnType)).toEqual("object")
    })

    test("interval datetime64[ns]", () => {
      const mockElement = { data: INTERVAL_DATETIME64 }
      const q = new Quiver(mockElement)
      const indexType = q.types.index[0]

      expect(getTypeName(indexType)).toEqual("interval[datetime64[ns], right]")
    })

    test("interval float64", () => {
      const mockElement = { data: INTERVAL_FLOAT64 }
      const q = new Quiver(mockElement)
      const indexType = q.types.index[0]

      expect(getTypeName(indexType)).toEqual("interval[float64, right]")
    })

    test("interval int64", () => {
      const mockElement = { data: INTERVAL_INT64 }
      const q = new Quiver(mockElement)
      const indexType = q.types.index[0]

      expect(getTypeName(indexType)).toEqual("interval[int64, right]")
    })

    test("interval uint64", () => {
      const mockElement = { data: INTERVAL_UINT64 }
      const q = new Quiver(mockElement)
      const indexType = q.types.index[0]

      expect(getTypeName(indexType)).toEqual("interval[uint64, right]")
    })
  })

  describe("uses pandas_type", () => {
    test("categorical", () => {
      const mockElement = { data: CATEGORICAL }
      const q = new Quiver(mockElement)
      const indexType = q.types.index[0]

      expect(getTypeName(indexType)).toEqual(IndexTypeName.CategoricalIndex)
    })

    test("date", () => {
      const mockElement = { data: DATE }
      const q = new Quiver(mockElement)
      const indexType = q.types.index[0]

      expect(getTypeName(indexType)).toEqual(IndexTypeName.DatetimeIndex)
    })

    test("float64", () => {
      const mockElement = { data: FLOAT64 }
      const q = new Quiver(mockElement)
      const indexType = q.types.index[0]

      expect(getTypeName(indexType)).toEqual(IndexTypeName.Float64Index)
    })

    test("int64", () => {
      const mockElement = { data: INT64 }
      const q = new Quiver(mockElement)
      const indexType = q.types.index[0]

      expect(getTypeName(indexType)).toEqual(IndexTypeName.Int64Index)
    })

    test("range", () => {
      const mockElement = { data: RANGE }
      const q = new Quiver(mockElement)
      const indexType = q.types.index[0]

      expect(getTypeName(indexType)).toEqual(IndexTypeName.RangeIndex)
    })

    test("uint64", () => {
      const mockElement = { data: UINT64 }
      const q = new Quiver(mockElement)
      const indexType = q.types.index[0]

      expect(getTypeName(indexType)).toEqual(IndexTypeName.UInt64Index)
    })

    test("unicode", () => {
      const mockElement = { data: UNICODE }
      const q = new Quiver(mockElement)
      const indexType = q.types.index[0]

      expect(getTypeName(indexType)).toEqual(IndexTypeName.UnicodeIndex)
    })
  })
})

describe("isIntegerType", () => {
  it.each([
    [undefined, false],
    [
      {
        pandas_type: "float64",
        numpy_type: "float64",
      },
      false,
    ],
    [
      {
        pandas_type: "int64",
        numpy_type: "int64",
      },
      true,
    ],
    [
      {
        pandas_type: "object",
        numpy_type: "int16",
      },
      true,
    ],
    [
      {
        pandas_type: "range",
        numpy_type: "range",
      },
      true,
    ],
    [
      {
        pandas_type: "uint64",
        numpy_type: "uint64",
      },
      true,
    ],
    [
      {
        pandas_type: "unicode",
        numpy_type: "object",
      },
      false,
    ],
    [
      {
        pandas_type: "bool",
        numpy_type: "bool",
      },
      false,
    ],
    [
      {
        pandas_type: "categorical",
        numpy_type: "int8",
      },
      false,
    ],
    [
      {
        pandas_type: "object",
        numpy_type: "interval[int64, both]",
      },
      false,
    ],
  ])(
    "interprets %s as integer type: %s",
    (arrowType: Type | undefined, expected: boolean) => {
      expect(isIntegerType(arrowType)).toEqual(expected)
    }
  )
})

describe("isUnsignedIntegerType", () => {
  it.each([
    [undefined, false],
    [
      {
        pandas_type: "float64",
        numpy_type: "float64",
      },
      false,
    ],
    [
      {
        pandas_type: "int64",
        numpy_type: "int64",
      },
      false,
    ],
    [
      {
        pandas_type: "uint64",
        numpy_type: "uint64",
      },
      true,
    ],
    [
      {
        pandas_type: "object",
        numpy_type: "uint16",
      },
      true,
    ],
    [
      {
        pandas_type: "unicode",
        numpy_type: "object",
      },
      false,
    ],
    [
      {
        pandas_type: "bool",
        numpy_type: "bool",
      },
      false,
    ],
    [
      {
        pandas_type: "categorical",
        numpy_type: "uint8",
      },
      false,
    ],
  ])(
    "interprets %s as unsigned integer type: %s",
    (arrowType: Type | undefined, expected: boolean) => {
      expect(isUnsignedIntegerType(arrowType)).toEqual(expected)
    }
  )
})

describe("isBooleanType", () => {
  it.each([
    [undefined, false],
    [
      {
        pandas_type: "bool",
        numpy_type: "bool",
      },
      true,
    ],
    [
      {
        pandas_type: "object",
        numpy_type: "bool",
      },
      true,
    ],
    [
      {
        pandas_type: "int64",
        numpy_type: "int64",
      },
      false,
    ],
    [
      {
        pandas_type: "categorical",
        numpy_type: "bool",
      },
      false,
    ],
    [
      {
        pandas_type: "float64",
        numpy_type: "float64",
      },
      false,
    ],
  ])(
    "interprets %s as boolean type: %s",
    (arrowType: Type | undefined, expected: boolean) => {
      expect(isBooleanType(arrowType)).toEqual(expected)
    }
  )
})

describe("getTimezone", () => {
  it.each([
    [
      {
        pandas_type: "datetime",
        numpy_type: "datetime64[ns]",
        meta: { timezone: "UTC" },
      },
      "UTC",
    ],
    [
      {
        pandas_type: "datetime",
        numpy_type: "datetime64[ns]",
        meta: { timezone: "America/New_York" },
      },
      "America/New_York",
    ],
    [
      {
        pandas_type: "datetime",
        numpy_type: "datetime64[ns]",
        meta: {},
      },
      undefined,
    ],
    [
      {
        pandas_type: "datetime",
        numpy_type: "datetime64[ns]",
      },
      undefined,
    ],
  ])(
    "returns correct timezone for %o",
    (arrowType: Type, expected: string | undefined) => {
      expect(getTimezone(arrowType)).toEqual(expected)
    }
  )
})

describe("isFloatType", () => {
  it.each([
    [undefined, false],
    [
      {
        pandas_type: "float64",
        numpy_type: "float64",
      },
      true,
    ],
    [
      {
        pandas_type: "object",
        numpy_type: "float32",
      },
      true,
    ],
    [
      {
        pandas_type: "int64",
        numpy_type: "int64",
      },
      false,
    ],
    [
      {
        pandas_type: "categorical",
        numpy_type: "float64",
      },
      false,
    ],
    [
      {
        pandas_type: "bool",
        numpy_type: "bool",
      },
      false,
    ],
  ])(
    "interprets %s as float type: %s",
    (arrowType: Type | undefined, expected: boolean) => {
      expect(isFloatType(arrowType)).toEqual(expected)
    }
  )
})

describe("isDecimalType", () => {
  it.each([
    [undefined, false],
    [
      {
        pandas_type: "object",
        numpy_type: "decimal",
      },
      true,
    ],
    [
      {
        pandas_type: "float64",
        numpy_type: "float64",
      },
      false,
    ],
    [
      {
        pandas_type: "int64",
        numpy_type: "int64",
      },
      false,
    ],
    [
      {
        pandas_type: "categorical",
        numpy_type: "decimal",
      },
      false,
    ],
  ])(
    "interprets %s as decimal type: %s",
    (arrowType: Type | undefined, expected: boolean) => {
      expect(isDecimalType(arrowType)).toEqual(expected)
    }
  )
})

describe("isNumericType", () => {
  it.each([
    [undefined, false],
    [
      {
        pandas_type: "float64",
        numpy_type: "float64",
      },
      true,
    ],
    [
      {
        pandas_type: "int64",
        numpy_type: "int64",
      },
      true,
    ],
    [
      {
        pandas_type: "object",
        numpy_type: "decimal",
      },
      true,
    ],
    [
      {
        pandas_type: "uint64",
        numpy_type: "uint64",
      },
      true,
    ],
    [
      {
        pandas_type: "bool",
        numpy_type: "bool",
      },
      false,
    ],
    [
      {
        pandas_type: "categorical",
        numpy_type: "float64",
      },
      false,
    ],
    [
      {
        pandas_type: "unicode",
        numpy_type: "object",
      },
      false,
    ],
  ])(
    "interprets %s as numeric type: %s",
    (arrowType: Type | undefined, expected: boolean) => {
      expect(isNumericType(arrowType)).toEqual(expected)
    }
  )
})
