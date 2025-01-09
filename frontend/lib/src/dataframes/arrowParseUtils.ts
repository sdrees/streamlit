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
  isRangeIndex,
  PandasColumnType,
  PandasIndexTypeName,
  PandasRangeIndex,
} from "./arrowTypeUtils"

/**
 * Index data value.
 */
type IndexValue = Vector | number[]

/**
 * A row-major matrix of DataFrame index data values.
 */
export type IndexData = IndexValue[]

/**
 * A row-major matrix of DataFrame column header names.
 * This is a matrix (multidimensional array) to support multi-level headers.
 *
 * NOTE: ArrowJS automatically formats the columns in schema, i.e. we always get strings.
 */
export type ColumnNames = string[][]

/**
 * A row-major grid of DataFrame data.
 */
export type Data = Table

/** A DataFrame's index and data column (pandas) types. */
export interface PandasColumnTypes {
  /** Types for each index column. */
  index: PandasColumnType[]

  /** Types for each data column. */
  data: PandasColumnType[]
}

/**
 * Metadata for a single column in an Arrow table.
 * (This can describe an index *or* a data column.)
 */
interface ColumnMetadata {
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
 * The Pandas schema extracted from an Arrow table.
 * Arrow stores the schema as a JSON string, and we parse it into this typed object.
 * The Pandas schema is only present if the Arrow table was processed through Pandas.
 */
interface PandasSchema {
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
  index_columns: (string | PandasRangeIndex)[]

  /**
   * Schemas for each column (index *and* data columns) in the DataFrame.
   */
  columns: ColumnMetadata[]

  /**
   * DataFrame column headers.
   * The length represents the dimensions of the DataFrame's columns grid.
   */
  column_indexes: ColumnMetadata[]
}

/**
 * Parse the Pandas schema that is embedded in the Arrow table if the table was
 * processed through Pandas.
 */
function parsePandasSchema(table: Table): PandasSchema {
  const schema = table.schema.metadata.get("pandas")
  if (isNullOrUndefined(schema)) {
    // This should never happen!
    throw new Error("Table schema is missing.")
  }
  return JSON.parse(schema)
}

/** Get unprocessed column names for data columns. Needed for selecting
 * data columns when there are multi-columns. */
function getRawColumns(pandasSchema: PandasSchema): string[] {
  return (
    pandasSchema.columns
      .map(columnSchema => columnSchema.field_name)
      // Filter out all index columns
      .filter(columnName => !pandasSchema.index_columns.includes(columnName))
  )
}

/** Parse DataFrame's index data values. */
function parseIndexData(table: Table, pandasSchema: PandasSchema): IndexData {
  // TODO(lukasmasuch): Is range index the only case that is not from
  // the table data?
  return pandasSchema.index_columns
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
function parseIndexNames(schema: PandasSchema): string[] {
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

/** Parse DataFrame's column header names. */
function parseColumnNames(pandasSchema: PandasSchema): ColumnNames {
  // If DataFrame `columns` has multi-level indexing, the length of
  // `column_indexes` will show how many levels there are.
  const isMultiIndex = pandasSchema.column_indexes.length > 1

  // Perform the following transformation:
  // ["('1','foo')", "('2','bar')", "('3','baz')"] -> ... -> [["1", "2", "3"], ["foo", "bar", "baz"]]
  return unzip(
    pandasSchema.columns
      .map(columnSchema => columnSchema.field_name)
      // Filter out all index columns
      .filter(fieldName => !pandasSchema.index_columns.includes(fieldName))
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

/** Parse DataFrame's non-index data into a Table object. */
function parseData(
  table: Table,
  columnNames: ColumnNames,
  rawColumns: string[]
): Data {
  const numDataRows = table.numRows
  const numDataColumns = columnNames.length > 0 ? columnNames[0].length : 0
  if (numDataRows === 0 || numDataColumns === 0) {
    return table.select([])
  }

  return table.select(rawColumns)
}

/** Parse DataFrame's index and data types. */
function parseColumnTypes(
  table: Table,
  pandasSchema: PandasSchema
): PandasColumnTypes {
  const index = parseIndexType(pandasSchema)
  const data = parseDataType(pandasSchema)
  return { index, data }
}

/** Parse types for each non-index column. */
function parseDataType(pandasSchema: PandasSchema): PandasColumnType[] {
  return (
    pandasSchema.columns
      // Filter out all index columns
      .filter(
        columnSchema =>
          !pandasSchema.index_columns.includes(columnSchema.field_name)
      )
      .map(columnSchema => ({
        pandas_type: columnSchema.pandas_type,
        numpy_type: columnSchema.numpy_type,
        meta: columnSchema.metadata,
      }))
  )
}

/** Parse types for each index column. */
function parseIndexType(pandasSchema: PandasSchema): PandasColumnType[] {
  return pandasSchema.index_columns.map(indexName => {
    if (isRangeIndex(indexName)) {
      return {
        pandas_type: PandasIndexTypeName.RangeIndex,
        numpy_type: PandasIndexTypeName.RangeIndex,
        meta: indexName as PandasRangeIndex,
      }
    }

    // Find the index column we're looking for in the schema.
    const indexColumn = pandasSchema.columns.find(
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

/** Parse Arrow fields into a mapping from column name (field name) to Field metadata. */
function parseFields(arrowSchema: ArrowSchema): Record<string, Field> {
  // None-index data columns are listed first, and all index columns listed last
  // within the fields array in arrow.
  return Object.fromEntries(
    (arrowSchema.fields || []).map((field, index) => [
      field.name.startsWith("__index_level_") ? field.name : String(index),
      field,
    ])
  )
}

interface ParsedTable {
  columnNames: ColumnNames
  fields: Record<string, Field>
  indexData: IndexData
  indexNames: string[]
  data: Data
  columnTypes: PandasColumnTypes
}

/**
 * Parse Arrow bytes (IPC format).
 *
 * @param ipcBytes - Arrow bytes (IPC format)
 * @returns - Parsed Arrow table split into different
 *  components for easier access: columnNames, fields, indexData, indexNames, data, columnTypes.
 */
export function parseArrowIpcBytes(
  ipcBytes: Uint8Array | null | undefined
): ParsedTable {
  // Load arrow table object from IPC data
  const table = tableFromIPC(ipcBytes)
  // Load field information for all columns:
  const fields = parseFields(table.schema)

  // Load pandas schema from metadata (if it exists):
  const pandasSchema = parsePandasSchema(table)

  // Load all column names from table schema:
  const columnNames = parseColumnNames(pandasSchema)

  // Load the display names of the index columns:
  const indexNames = parseIndexNames(pandasSchema)

  // Extract unprocessed column names from pandas schema
  // (needed for parsing the data cells below):
  const rawColumns = getRawColumns(pandasSchema)

  // Load all non-index data cells:
  const data = parseData(table, columnNames, rawColumns)

  // Load all index data cells:
  const indexData = parseIndexData(table, pandasSchema)

  // Load types for index and data columns:
  const columnTypes = parseColumnTypes(table, pandasSchema)

  return {
    columnNames,
    fields,
    indexData,
    indexNames,
    data,
    columnTypes,
  }
}
