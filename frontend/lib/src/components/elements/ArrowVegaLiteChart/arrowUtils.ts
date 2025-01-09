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

import {
  getTypeName,
  IndexTypeName,
} from "@streamlit/lib/src/dataframes/arrowTypeUtils"
import { Quiver } from "@streamlit/lib/src/dataframes/Quiver"
import { isNullOrUndefined } from "@streamlit/lib/src/util/utils"

const MagicFields = {
  DATAFRAME_INDEX: "(index)",
}

/** Types of dataframe-indices that are supported as x axis. */
const SUPPORTED_INDEX_TYPES = new Set([
  IndexTypeName.DatetimeIndex,
  IndexTypeName.Float64Index,
  IndexTypeName.Int64Index,
  IndexTypeName.RangeIndex,
  IndexTypeName.UInt64Index,
])

/** All of the data that makes up a VegaLite chart. */
export interface VegaLiteChartElement {
  /**
   * The dataframe that will be used as the chart's main data source, if
   * specified using Vega-Lite's inline API.
   *
   * This is mutually exclusive with WrappedNamedDataset - if `data` is non-null,
   * `datasets` will not be populated; if `datasets` is populated, then `data`
   * will be null.
   */
  data: Quiver | null

  /** The a JSON-formatted string with the Vega-Lite spec. */
  spec: string

  /**
   * Dataframes associated with this chart using Vega-Lite's datasets API,
   * if any.
   */
  datasets: WrappedNamedDataset[]

  /** If True, will overwrite the chart width spec to fit to container. */
  useContainerWidth: boolean

  /** override the properties with a theme. Currently, only "streamlit" or None are accepted. */
  vegaLiteTheme: string

  /** The widget ID. Only set if selections are activated. */
  id: string

  /** Named selection parameters that are activated to trigger reruns. */
  selectionMode: string[]

  /** The form ID if the chart has activated selections and is used within a form. */
  formId: string
}

/** A mapping of `ArrowNamedDataSet.proto`. */
export interface WrappedNamedDataset {
  /** The dataset's optional name. */
  name: string | null

  /** True if the name field (above) was manually set. */
  hasName: boolean

  /** The data itself, wrapped in a Quiver object. */
  data: Quiver
}

export function getInlineData(
  quiverData: Quiver | null
): { [field: string]: any }[] | null {
  if (!quiverData || quiverData.data.numRows === 0) {
    return null
  }

  return getDataArray(quiverData)
}

export function getDataArrays(
  datasets: WrappedNamedDataset[]
): { [dataset: string]: any[] } | null {
  const datasetMapping = getDataSets(datasets)
  if (isNullOrUndefined(datasetMapping)) {
    return null
  }

  const datasetArrays: { [dataset: string]: any[] } = {}

  for (const [name, dataset] of Object.entries(datasetMapping)) {
    datasetArrays[name] = getDataArray(dataset)
  }

  return datasetArrays
}

export function getDataSets(
  datasets: WrappedNamedDataset[]
): { [dataset: string]: Quiver } | null {
  if (datasets?.length === 0) {
    return null
  }

  const datasetMapping: { [dataset: string]: Quiver } = {}

  datasets.forEach((x: WrappedNamedDataset) => {
    if (!x) {
      return
    }
    const name = x.hasName ? x.name : null
    datasetMapping[name as string] = x.data
  })

  return datasetMapping
}

/**
 * Retrieves an array of data from Quiver starting from a specified index.
 * Converts data values to a format compatible with VegaLite visualization.
 *
 * @param {Quiver} quiverData - The Quiver data object to extract data from.
 * @param {number} [startIndex=0] - The starting index for data extraction.
 * @returns {Array.<{ [field: string]: any }>} An array of data objects for visualization.
 */
export function getDataArray(
  quiverData: Quiver,
  startIndex = 0
): { [field: string]: any }[] {
  if (quiverData.isEmpty()) {
    return []
  }

  const dataArr = []
  const { dataRows: rows, dataColumns: cols } = quiverData.dimensions

  const indexType = getTypeName(quiverData.types.index[0])
  const hasSupportedIndex = SUPPORTED_INDEX_TYPES.has(
    indexType as IndexTypeName
  )

  for (let rowIndex = startIndex; rowIndex < rows; rowIndex++) {
    const row: { [field: string]: any } = {}

    if (hasSupportedIndex) {
      const indexValue = quiverData.getIndexValue(rowIndex, 0)
      // VegaLite can't handle BigInts, so they have to be converted to Numbers first
      row[MagicFields.DATAFRAME_INDEX] =
        typeof indexValue === "bigint" ? Number(indexValue) : indexValue
    }

    for (let colIndex = 0; colIndex < cols; colIndex++) {
      const dataValue = quiverData.getDataValue(rowIndex, colIndex)
      const dataType = quiverData.types.data[colIndex]
      const typeName = getTypeName(dataType)

      if (
        typeName !== "datetimetz" &&
        (dataValue instanceof Date || Number.isFinite(dataValue)) &&
        (typeName.startsWith("datetime") || typeName === "date")
      ) {
        // For dates that do not contain timezone information.
        // Vega JS assumes dates in the local timezone, so we need to convert
        // UTC date to be the same date in the local timezone.
        const offset = new Date(dataValue).getTimezoneOffset() * 60 * 1000 // minutes to milliseconds
        row[quiverData.columns[0][colIndex]] = dataValue.valueOf() + offset
      } else if (typeof dataValue === "bigint") {
        row[quiverData.columns[0][colIndex]] = Number(dataValue)
      } else {
        row[quiverData.columns[0][colIndex]] = dataValue
      }
    }
    dataArr.push(row)
  }

  return dataArr
}

/**
 * Checks if data looks like it's just prevData plus some appended rows.
 */
export function dataIsAnAppendOfPrev(
  prevData: Quiver,
  prevNumRows: number,
  prevNumCols: number,
  data: Quiver,
  numRows: number,
  numCols: number
): boolean {
  // Check whether dataframes have the same shape.

  // not an append
  if (prevNumCols !== numCols) {
    return false
  }

  // Data can be updated, but still have the same number of rows.
  // We consider the case an append only when the number of rows has increased
  if (prevNumRows >= numRows) {
    return false
  }

  // if no previous data, render from scratch
  if (prevNumRows === 0) {
    return false
  }

  const c = numCols - 1
  const r = prevNumRows - 1

  // Check if the new dataframe looks like it's a superset of the old one.
  // (this is a very light check, and not guaranteed to be right!)
  if (
    prevData.getDataValue(0, c) !== data.getDataValue(0, c) ||
    prevData.getDataValue(r, c) !== data.getDataValue(r, c)
  ) {
    return false
  }

  return true
}
