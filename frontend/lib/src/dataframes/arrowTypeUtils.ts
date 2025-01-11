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

import { Dictionary, Struct, StructRow, Vector } from "apache-arrow"

import { isNullOrUndefined } from "@streamlit/lib/src/util/utils"

/** Data types used by ArrowJS. */
export type DataType =
  | null
  | boolean
  | number
  | string
  | Date // datetime
  | Int32Array // int
  | Uint8Array // bytes
  | Uint32Array // Decimal
  | Vector // arrays
  | StructRow // interval
  | Dictionary // categorical
  | Struct // dict
  | bigint // period

/** The name we use for range index columns.  We have to set the name ourselves since range
 * indices are not included in the data or the arrow schema.
 */
export const PandasRangeIndexType = "range"

/** Pandas type information for single-index columns, and data columns. */
export interface PandasColumnType {
  /** The type label returned by pandas.api.types.infer_dtype */
  pandas_type: string

  /** The numpy dtype that corresponds to the types returned in df.dtypes */
  numpy_type: string

  /** Type metadata. */
  meta?: Record<string, any> | null
}

/** Metadata for the "range" index type. */
export interface PandasRangeIndex {
  kind: "range"
  name: string | null
  start: number
  step: number
  stop: number
}

/**
 * Converts an Arrow vector to a list of strings.
 *
 * @param vector The Arrow vector to convert.
 * @returns The list of strings.
 */
export function convertVectorToList(vector: Vector<any>): string[] {
  const values = []

  for (let i = 0; i < vector.length; i++) {
    values.push(vector.get(i))
  }
  return values
}

/** Returns type for a single-index column or data column. */
export function getTypeName(type: PandasColumnType): string {
  // For `PeriodType` and `IntervalType` types are kept in `numpy_type`,
  // for the rest of the indexes in `pandas_type`.
  return type.pandas_type === "object" ? type.numpy_type : type.pandas_type
}

/** Returns the timezone of the arrow type metadata. */
export function getTimezone(arrowType: PandasColumnType): string | undefined {
  // TODO(lukasmasuch): Use info from field instead:
  // return arrowType?.field?.type?.timezone
  return arrowType?.meta?.timezone
}

/** True if the arrow type is an integer type.
 * For example: int8, int16, int32, int64, uint8, uint16, uint32, uint64, range
 */
export function isIntegerType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  const typeName = getTypeName(type) ?? ""
  return (
    (typeName.startsWith("int") && !isIntervalType(type)) ||
    isRangeIndexType(type) ||
    isUnsignedIntegerType(type)
  )
}

/** True if the arrow type is an unsigned integer type. */
export function isUnsignedIntegerType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type)?.startsWith("uint")
}

/** True if the arrow type is a float type.
 * For example: float16, float32, float64, float96, float128
 */
export function isFloatType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type)?.startsWith("float")
}

/** True if the arrow type is a decimal type. */
export function isDecimalType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type) === "decimal"
}

/** True if the arrow type is a numeric type. */
export function isNumericType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return isIntegerType(type) || isFloatType(type) || isDecimalType(type)
}

/** True if the arrow type is a boolean type. */
export function isBooleanType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type) === "bool"
}

/** True if the arrow type is a duration type. */
export function isDurationType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type)?.startsWith("timedelta")
}

/** True if the arrow type is a period type. */
export function isPeriodType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type)?.startsWith("period")
}

/** True if the arrow type is a datetime type. */
export function isDatetimeType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type)?.startsWith("datetime")
}

/** True if the arrow type is a date type. */
export function isDateType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type) === "date"
}

/** True if the arrow type is a time type. */
export function isTimeType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type) === "time"
}

/** True if the arrow type is a categorical type. */
export function isCategoricalType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type) === "categorical"
}

/** True if the arrow type is a list type. */
export function isListType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type)?.startsWith("list")
}

/** True if the arrow type is an object type. */
export function isObjectType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type) === "object"
}

/** True if the arrow type is a bytes type. */
export function isBytesType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type) === "bytes"
}

/** True if the arrow type is a string type. */
export function isStringType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return ["unicode", "large_string[pyarrow]"].includes(getTypeName(type))
}

/** True if the arrow type is an empty type. */
export function isEmptyType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type) === "empty"
}

/** True if the arrow type is a interval type. */
export function isIntervalType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type)?.startsWith("interval")
}

/** True if the arrow type is a range index type. */
export function isRangeIndexType(type?: PandasColumnType): boolean {
  if (isNullOrUndefined(type)) {
    return false
  }
  return getTypeName(type) === PandasRangeIndexType
}
