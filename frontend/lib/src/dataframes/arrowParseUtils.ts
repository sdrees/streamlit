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
 * Utility functions used by Quiver to parse arrow data from IPC bytes.
 */

import {
  Schema as ArrowSchema,
  Field,
  Null,
  Table,
  tableFromIPC,
  Vector,
} from "apache-arrow"
import range from "lodash/range"
import unzip from "lodash/unzip"

import { isNullOrUndefined } from "@streamlit/lib/src/util/utils"

import {
  IndexTypeName,
  isRangeIndex,
  RangeIndex,
  Type,
} from "./arrowTypeUtils"

/**
 * A row-major grid of DataFrame index header values.
 */
type IndexValue = Vector | number[]

/**
 * A row-major grid of DataFrame index header values.
 */
export type Index = IndexValue[]

/**
 * A row-major grid of DataFrame column header values.
 * NOTE: ArrowJS automatically formats the columns in schema, i.e. we always get strings.
 */
export type Columns = string[][]

/**
 * A row-major grid of DataFrame data.
 */
export type Data = Table

/** DataFrame index and data types. */
export interface Types {
  /** Types for each index column. */
  index: Type[]

  /** Types for each data column. */
  // NOTE: `DataTypeName` should be used here, but as it's hard (maybe impossible)
  // to define such recursive types in TS, `string` will suffice for now.
  data: Type[]
}

/**
 * Metadata for a single column in an Arrow table.
 * (This can describe an index *or* a data column.)
 */
interface ColumnSchema {
  /**
   * The fieldName of the column.
   * For a single-index column, this is just the name of the column (e.g. "foo").
   * For a multi-index column, this is a stringified tuple (e.g. "('1','foo')")
   */
  field_name: string

  /**
   * Column-specific metadata. Only used by certain column types
   * (e.g. CategoricalIndex has `num_categories`.)
   */
  metadata: Record<string, any> | null

  /** The name of the column. */
  name: string | null

  /**
   * The type of the column. When `pandas_type == "object"`, `numpy_type`
   * will have a more specific type.
   */
  pandas_type: string

  /**
   * When `pandas_type === "object"`, this field contains the object type.
   * If pandas_type has another value, numpy_type is ignored.
   */
  numpy_type: string
}

/**
 * The Arrow table schema. It's a blueprint that tells us where data
 * is stored in the associated table. (Arrow stores the schema as a JSON string,
 * and we parse it into this typed object - so these member names come from
 * Arrow.)
 */
interface Schema {
  /**
   * The DataFrame's index names (either provided by user or generated,
   * guaranteed unique). It is used to fetch the index data. Each DataFrame has
   * at least 1 index. There are many different index types; for most of them
   * the index name is stored as a string, but for the "range" index a `RangeIndex`
   * object is used. A `RangeIndex` is only ever by itself, never as part of a
   * multi-index. The length represents the dimensions of the DataFrame's index grid.
   *
   * Example:
   * Range index: [{ kind: "range", name: null, start: 1, step: 1, stop: 5 }]
   * Other index types: ["__index_level_0__", "foo", "bar"]
   */
  index_columns: (string | RangeIndex)[]

  /**
   * Schemas for each column (index *and* data columns) in the DataFrame.
   */
  columns: ColumnSchema[]

  /**
   * DataFrame column headers.
   * The length represents the dimensions of the DataFrame's columns grid.
   */
  column_indexes: ColumnSchema[]
}

/** Parse Arrow table's schema from a JSON string to an object. */
function parseSchema(table: Table): Schema {
  const schema = table.schema.metadata.get("pandas")
  if (isNullOrUndefined(schema)) {
    // This should never happen!
    throw new Error("Table schema is missing.")
  }
  return JSON.parse(schema)
}

/** Get unprocessed column names for data columns. Needed for selecting
 * data columns when there are multi-columns. */
function getRawColumns(schema: Schema): string[] {
  return (
    schema.columns
      .map(columnSchema => columnSchema.field_name)
      // Filter out all index columns
      .filter(columnName => !schema.index_columns.includes(columnName))
  )
}

/** Parse DataFrame's index header values. */
function parseIndex(table: Table, schema: Schema): Index {
  return schema.index_columns
    .map(indexName => {
      // Generate a range using the "range" index metadata.
      if (isRangeIndex(indexName)) {
        const { start, stop, step } = indexName
        return range(start, stop, step)
      }

      // Otherwise, use the index name to get the index column data.
      const column = table.getChild(indexName as string)
      if (column instanceof Vector && column.type instanceof Null) {
        return null
      }
      return column
    })
    .filter(
      (column: IndexValue | null): column is IndexValue => column !== null
    )
}

/** Parse DataFrame's index header names. */
function parseIndexNames(schema: Schema): string[] {
  return schema.index_columns.map(indexName => {
    // Range indices are treated differently since they
    // contain additional metadata (e.g. start, stop, step).
    // and not just the name.
    if (isRangeIndex(indexName)) {
      const { name } = indexName
      return name || ""
    }
    if (indexName.startsWith("__index_level_")) {
      // Unnamed indices can have a name like "__index_level_0__".
      return ""
    }
    return indexName
  })
}

/** Parse DataFrame's column header values. */
function parseColumns(schema: Schema): Columns {
  // If DataFrame `columns` has multi-level indexing, the length of
  // `column_indexes` will show how many levels there are.
  const isMultiIndex = schema.column_indexes.length > 1

  // Perform the following transformation:
  // ["('1','foo')", "('2','bar')", "('3','baz')"] -> ... -> [["1", "2", "3"], ["foo", "bar", "baz"]]
  return unzip(
    schema.columns
      .map(columnSchema => columnSchema.field_name)
      // Filter out all index columns
      .filter(fieldName => !schema.index_columns.includes(fieldName))
      .map(fieldName =>
        isMultiIndex
          ? JSON.parse(
              fieldName
                .replace(/\(/g, "[")
                .replace(/\)/g, "]")
                .replace(/'/g, '"')
            )
          : [fieldName]
      )
  )
}

/** Parse DataFrame's data. */
function parseData(
  table: Table,
  columns: Columns,
  rawColumns: string[]
): Data {
  const numDataRows = table.numRows
  const numDataColumns = columns.length > 0 ? columns[0].length : 0
  if (numDataRows === 0 || numDataColumns === 0) {
    return table.select([])
  }

  return table.select(rawColumns)
}

/** Parse DataFrame's index and data types. */
function parseTypes(table: Table, schema: Schema): Types {
  const index = parseIndexType(schema)
  const data = parseDataType(table, schema)
  return { index, data }
}

/** Parse types for each non-index column. */
function parseDataType(table: Table, schema: Schema): Type[] {
  return (
    schema.columns
      // Filter out all index columns
      .filter(
        columnSchema => !schema.index_columns.includes(columnSchema.field_name)
      )
      .map(columnSchema => ({
        pandas_type: columnSchema.pandas_type,
        numpy_type: columnSchema.numpy_type,
        meta: columnSchema.metadata,
      }))
  )
}

/** Parse types for each index column. */
function parseIndexType(schema: Schema): Type[] {
  return schema.index_columns.map(indexName => {
    if (isRangeIndex(indexName)) {
      return {
        pandas_type: IndexTypeName.RangeIndex,
        numpy_type: IndexTypeName.RangeIndex,
        meta: indexName as RangeIndex,
      }
    }

    // Find the index column we're looking for in the schema.
    const indexColumn = schema.columns.find(
      column => column.field_name === indexName
    )

    // This should never happen!
    if (!indexColumn) {
      throw new Error(`${indexName} index not found.`)
    }

    return {
      pandas_type: indexColumn.pandas_type,
      numpy_type: indexColumn.numpy_type,
      meta: indexColumn.metadata,
    }
  })
}

function parseFields(schema: ArrowSchema): Record<string, Field> {
  // None-index data columns are listed first, and all index columns listed last
  // within the fields array in arrow.
  return Object.fromEntries(
    (schema.fields || []).map((field, index) => [
      field.name.startsWith("__index_level_") ? field.name : String(index),
      field,
    ])
  )
}

interface ParsedTable {
  columns: Columns
  fields: Record<string, Field>
  index: Index
  indexNames: string[]
  data: Data
  types: Types
}

/**
 * Parse Arrow bytes (IPC format).
 *
 * @param ipcBytes - Arrow bytes (IPC format)
 * @returns - Parsed Arrow table split into different
 *  components for easier access: columns, fields, index, indexNames, data, types.
 */
export function parseArrowIpcBytes(
  ipcBytes: Uint8Array | null | undefined
): ParsedTable {
  const table = tableFromIPC(ipcBytes)
  const schema = parseSchema(table)
  const rawColumns = getRawColumns(schema)
  const fields = parseFields(table.schema)

  const index = parseIndex(table, schema)
  const columns = parseColumns(schema)
  const indexNames = parseIndexNames(schema)
  const data = parseData(table, columns, rawColumns)
  const types = parseTypes(table, schema)

  return {
    columns,
    fields,
    index,
    indexNames,
    data,
    types,
  }
}
