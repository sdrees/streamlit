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

// Private members use _.
/* eslint-disable no-underscore-dangle */

import { Dictionary, Field, Vector } from "apache-arrow"
import { immerable, produce } from "immer"

import { IArrow, Styler as StylerProto } from "@streamlit/lib/src/proto"
import {
  hashString,
  isNullOrUndefined,
  notNullOrUndefined,
} from "@streamlit/lib/src/util/utils"

import { concat } from "./arrowConcatUtils"
import {
  ColumnNames,
  Data,
  IndexData,
  PandasColumnTypes,
  parseArrowIpcBytes,
} from "./arrowParseUtils"
import {
  convertVectorToList,
  DataType,
  PandasColumnType,
  PandasIndexTypeName,
} from "./arrowTypeUtils"

/**
 * Pandas Styler data from proto message.
 *
 * This is only present if the DataFrame was created based
 * on a Pandas Styler object.
 */
interface PandasStylerData {
  /** UUID from Styler. */
  uuid: string

  /** Optional user-specified caption. */
  caption: string | null

  /** CSS styles from Styler. */
  styles: string | null

  /**
   * Stringified versions of each cell in the DataFrame, in the
   * user-specified format.
   *
   * The display values table is expected to always have the same
   * dimensions as the actual data table.
   */
  displayValues: Quiver
}

/** Dimensions of the DataFrame. */
interface DataFrameDimensions {
  // The number of header rows (> 1 for multi-level headers)
  headerRows: number
  // The number of index columns
  indexColumns: number
  // The number of data rows (excluding header rows)
  dataRows: number
  // The number of data columns (excluding index columns)
  dataColumns: number
  // The total number of rows (header rows + data rows)
  rows: number
  // The total number of columns (index + data columns)
  columns: number
}

/**
 * There are 4 cell types:
 *  - blank, cells that are not part of index headers, column headers, or data
 *  - index, index header cells
 *  - columns, column header cells
 *  - data, data cells
 */
export enum DataFrameCellType {
  BLANK = "blank",
  INDEX = "index",
  COLUMNS = "columns",
  DATA = "data",
}

/** Data for a single cell in a DataFrame. */
export interface DataFrameCell {
  /** The cell's type (blank, index, columns, or data). */
  type: DataFrameCellType

  /** The cell's CSS id, if the DataFrame has Styler. */
  cssId?: string

  /** The cell's CSS class. */
  cssClass: string

  /** The cell's content. */
  content: DataType

  /** The cell's content type. */
  // For "blank" cells "contentType" is undefined.
  contentType?: PandasColumnType

  /** The cell's field. */
  field?: Field

  /**
   * The cell's formatted content string, if the DataFrame was created with a Styler.
   * If the DataFrame is unstyled, displayContent will be undefined, and display
   * code should apply a default formatting to the `content` value instead.
   */
  displayContent?: string
}

/**
 * Parses data from an Arrow table, and stores it in a row-major format
 * (which is more useful for our frontend display code than Arrow's columnar format).
 */
export class Quiver {
  /**
   * Plain objects (objects without a prototype), arrays, Maps and Sets are always drafted by Immer.
   * Every other object must use the immerable symbol to mark itself as compatible with Immer.
   * When one of these objects is mutated within a producer, its prototype is preserved between copies.
   * Source: https://immerjs.github.io/immer/complex-objects/
   */
  [immerable] = true

  /** Column names (matrix of column names to support multi-level headers). */
  private _columnNames: ColumnNames

  /** Column names of the index columns (there can be multiple index columns). */
  private _indexNames: string[]

  /** Cell values of the index columns (there can be multiple index columns). */
  private _indexData: IndexData

  /** Cell values of the data columns. */
  private _data: Data

  /** Definition for DataFrame's fields. */
  private _fields: Record<string, Field<any>>

  /** Types (from Pandas) for DataFrame's index and data columns. */
  private _columnTypes: PandasColumnTypes

  /** [optional] Pandas Styler data. This will be defined if the user styled the dataframe. */
  private readonly _styler?: PandasStylerData

  /** Number of bytes in the Arrow IPC bytes. */
  private _num_bytes: number

  constructor(element: IArrow) {
    const { indexData, columnNames, data, columnTypes, fields, indexNames } =
      parseArrowIpcBytes(element.data)

    // Load styler data (if provided):
    const styler = element.styler
      ? parseStyler(element.styler as StylerProto)
      : undefined

    // The assignment is done below to avoid partially populating the instance
    // if an error is thrown.
    this._indexData = indexData
    this._columnNames = columnNames
    this._data = data
    this._columnTypes = columnTypes
    this._fields = fields
    this._styler = styler
    this._indexNames = indexNames
    this._num_bytes = element.data?.length ?? 0
  }

  /**
   * Returns the categorical options defined for a given data column.
   * Returns undefined if the column is not categorical.
   *
   * This function only works for non-index columns and expects the index at 0
   * for the first non-index data column.
   */
  public getCategoricalOptions(dataColumnIndex: number): string[] | undefined {
    const { dataColumns: numDataColumns } = this.dimensions

    if (dataColumnIndex < 0 || dataColumnIndex >= numDataColumns) {
      throw new Error(`Column index is out of range: ${dataColumnIndex}`)
    }

    if (!(this._fields[String(dataColumnIndex)].type instanceof Dictionary)) {
      // This is not a categorical column
      return undefined
    }

    const categoricalDict =
      this._data.getChildAt(dataColumnIndex)?.data[0]?.dictionary

    return notNullOrUndefined(categoricalDict)
      ? convertVectorToList(categoricalDict)
      : undefined
  }

  /** Cell values of the index columns (there can be multiple index columns). */
  public get indexData(): IndexData {
    return this._indexData
  }

  /** Column names of the index columns (there can be multiple index columns). */
  public get indexNames(): string[] {
    return this._indexNames
  }

  /** Column names of the data columns (there can be multiple data columns). */
  public get columnNames(): ColumnNames {
    return this._columnNames
  }

  /** Cell values of the data columns. */
  public get data(): Data {
    return this._data
  }

  /** Types (from Pandas) for the index and data columns. */
  public get columnTypes(): PandasColumnTypes {
    return this._columnTypes
  }

  /**
   * The CSS id given to the DataFrame from Pandas Styler (if it has one).
   *
   * If the DataFrame has a Styler, the  CSS id is `T_${StylerUUID}`. Otherwise,
   * it's undefined.
   *
   * This id is used by styled tables and styled dataframes to associate
   * the Styler CSS with the styled data.
   */
  public get cssId(): string | undefined {
    if (
      isNullOrUndefined(this._styler) ||
      isNullOrUndefined(this._styler.uuid)
    ) {
      return undefined
    }

    return `T_${this._styler.uuid}`
  }

  /** The DataFrame's CSS styles, if it has a Styler. */
  public get cssStyles(): string | undefined {
    return this._styler?.styles || undefined
  }

  /** The DataFrame's caption, if it's been set. */
  public get caption(): string | undefined {
    return this._styler?.caption || undefined
  }

  /** Dimensions of the DataFrame. */
  public get dimensions(): DataFrameDimensions {
    const indexColumns =
      // TODO(lukasmasuch): Change default to 0?
      this._indexData.length || this.columnTypes.index.length || 1
    const headerRows = this._columnNames.length || 1
    const dataRows = this._data.numRows || 0
    const dataColumns =
      this._data.numCols || this._columnNames?.[0]?.length || 0

    const rows = headerRows + dataRows
    const columns = indexColumns + dataColumns

    return {
      headerRows,
      indexColumns,
      dataRows,
      dataColumns,
      rows,
      columns,
    }
  }

  /**
   * A hash that identifies the underlying data.
   *
   * This hash is based on various descriptive information
   * but is not 100% guaranteed to be unique.
   */
  public get hash(): string {
    // Its important to calculate this at runtime
    // since some of the data can change when `add_rows` is
    // used.
    const valuesToHash = [
      this.dimensions.columns,
      this.dimensions.dataColumns,
      this.dimensions.dataRows,
      this.dimensions.indexColumns,
      this.dimensions.headerRows,
      this.dimensions.rows,
      this._num_bytes,
      this._columnNames,
    ]
    return hashString(valuesToHash.join("-"))
  }

  /** True if the DataFrame has no index, columns, and data. */
  public isEmpty(): boolean {
    return (
      this._indexData.length === 0 &&
      this._columnNames.length === 0 &&
      this._data.numRows === 0 &&
      this._data.numCols === 0
    )
  }

  /** Return a single cell in the table. */
  public getCell(rowIndex: number, columnIndex: number): DataFrameCell {
    const {
      headerRows,
      indexColumns: headerColumns,
      rows,
      columns,
    } = this.dimensions

    if (rowIndex < 0 || rowIndex >= rows) {
      throw new Error(`Row index is out of range: ${rowIndex}`)
    }
    if (columnIndex < 0 || columnIndex >= columns) {
      throw new Error(`Column index is out of range: ${columnIndex}`)
    }

    const isBlankCell = rowIndex < headerRows && columnIndex < headerColumns
    const isIndexCell = rowIndex >= headerRows && columnIndex < headerColumns
    const isColumnsCell = rowIndex < headerRows && columnIndex >= headerColumns

    if (isBlankCell) {
      // Blank cells include `blank`.
      const cssClass = ["blank"]
      if (columnIndex > 0) {
        cssClass.push(`level${rowIndex}`)
      }

      return {
        type: DataFrameCellType.BLANK,
        cssClass: cssClass.join(" "),
        content: "",
      }
    }

    if (isIndexCell) {
      const dataRowIndex = rowIndex - headerRows

      const cssId = this._styler?.uuid
        ? `${this.cssId}level${columnIndex}_row${dataRowIndex}`
        : undefined

      // Index label cells include:
      // - row_heading
      // - row<n> where n is the numeric position of the row
      // - level<k> where k is the level in a MultiIndex
      const cssClass = [
        `row_heading`,
        `level${columnIndex}`,
        `row${dataRowIndex}`,
      ].join(" ")

      const contentType = this._columnTypes.index[columnIndex]
      const content = this.getIndexValue(dataRowIndex, columnIndex)
      let field = this._fields[`__index_level_${String(columnIndex)}__`]
      if (field === undefined) {
        // If the index column has a name, we need to get it differently:
        field = this._fields[String(columns - headerColumns)]
      }
      return {
        type: DataFrameCellType.INDEX,
        cssId,
        cssClass,
        content,
        contentType,
        field,
      }
    }

    if (isColumnsCell) {
      const dataColumnIndex = columnIndex - headerColumns

      // Column label cells include:
      // - col_heading
      // - col<n> where n is the numeric position of the column
      // - level<k> where k is the level in a MultiIndex
      const cssClass = [
        `col_heading`,
        `level${rowIndex}`,
        `col${dataColumnIndex}`,
      ].join(" ")

      return {
        type: DataFrameCellType.COLUMNS,
        cssClass,
        content: this._columnNames[rowIndex][dataColumnIndex],
        // ArrowJS automatically converts "columns" cells to strings.
        // Keep ArrowJS structure for consistency.
        contentType: {
          pandas_type: PandasIndexTypeName.UnicodeIndex,
          numpy_type: "object",
        },
      }
    }

    const dataRowIndex = rowIndex - headerRows
    const dataColumnIndex = columnIndex - headerColumns

    const cssId = this._styler?.uuid
      ? `${this.cssId}row${dataRowIndex}_col${dataColumnIndex}`
      : undefined

    // Data cells include `data`.
    const cssClass = [
      "data",
      `row${dataRowIndex}`,
      `col${dataColumnIndex}`,
    ].join(" ")

    const contentType = this._columnTypes.data[dataColumnIndex]
    const field = this._fields[String(dataColumnIndex)]
    const content = this.getDataValue(dataRowIndex, dataColumnIndex)
    const displayContent = this._styler?.displayValues
      ? (this._styler.displayValues.getCell(rowIndex, columnIndex)
          .content as string)
      : undefined

    return {
      type: DataFrameCellType.DATA,
      cssId,
      cssClass,
      content,
      contentType,
      displayContent,
      field,
    }
  }

  /** Get the raw value of an index cell. */
  public getIndexValue(rowIndex: number, columnIndex: number): any {
    const index = this._indexData[columnIndex]
    const value =
      index instanceof Vector ? index.get(rowIndex) : index[rowIndex]
    return value
  }

  /** Get the raw value of a data cell. */
  public getDataValue(rowIndex: number, columnIndex: number): any {
    return this._data.getChildAt(columnIndex)?.get(rowIndex)
  }

  /**
   * Add the contents of another table (data + indexes) to this table.
   * Extra columns will not be created.
   */
  public addRows(other: Quiver): Quiver {
    if (this._styler || other._styler) {
      throw new Error(`
Unsupported operation. \`add_rows()\` does not support Pandas Styler objects.

If you do not need the Styler's styles, try passing the \`.data\` attribute of
the Styler object instead to concatenate just the underlying dataframe.

For example:
\`\`\`
st.add_rows(my_styler.data)
\`\`\`
`)
    }

    // Don't do anything if the incoming DataFrame is empty.
    if (other.isEmpty()) {
      return produce(this, (draft: Quiver) => draft)
    }

    // We need to handle this separately, as columns need to be reassigned.
    // We don't concatenate columns in the general case.
    if (this.isEmpty()) {
      return produce(other, (draft: Quiver) => draft)
    }

    const {
      index: newIndex,
      data: newData,
      types: newTypes,
    } = concat(
      this._columnTypes,
      this._indexData,
      this._data,
      other._columnTypes,
      other._indexData,
      other._data
    )

    // If we get here, then we had no concatenation errors.
    return produce(this, (draft: Quiver) => {
      draft._indexData = newIndex
      draft._data = newData
      draft._columnTypes = newTypes
    })
  }
}

/** Parse Pandas styler information from proto. */
function parseStyler(pandasStyler: StylerProto): PandasStylerData {
  return {
    uuid: pandasStyler.uuid,
    caption: pandasStyler.caption,
    styles: pandasStyler.styles,

    // Recursively create a new Quiver instance for Styler's display values.
    // This values will be used for rendering the DataFrame, while the original values
    // will be used for sorting, etc.
    displayValues: new Quiver({ data: pandasStyler.displayValues }),
  }
}
