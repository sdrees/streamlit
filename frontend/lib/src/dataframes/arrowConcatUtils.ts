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
 * Utility functions used to concatenate Arrow tables. This is used by
 * the add row functionality for dataframe, table & charts.
 */

import range from "lodash/range"
import zip from "lodash/zip"

import { Data, IndexData, PandasColumnTypes } from "./arrowParseUtils"
import {
  getTypeName,
  PandasColumnType,
  PandasIndexTypeName,
  PandasRangeIndex,
  sameDataTypes,
  sameIndexTypes,
} from "./arrowTypeUtils"

/** Concatenate the original DataFrame index with the given one. */
function concatIndexes(
  baseIndex: IndexData,
  baseIndexTypes: PandasColumnType[],
  appendIndex: IndexData,
  appendIndexTypes: PandasColumnType[]
): IndexData {
  // If one of the `index` arrays is empty, return the other one.
  // Otherwise, they will have different types and an error will be thrown.
  if (appendIndex.length === 0) {
    return baseIndex
  }
  if (baseIndex.length === 0) {
    return appendIndex
  }

  // Make sure indexes have same types.
  if (!sameIndexTypes(baseIndexTypes, appendIndexTypes)) {
    const receivedIndexTypes = appendIndexTypes.map(index =>
      getTypeName(index)
    )
    const expectedIndexTypes = baseIndexTypes.map(index => getTypeName(index))

    throw new Error(`
Unsupported operation. The data passed into \`add_rows()\` must have the same
index signature as the original data.

In this case, \`add_rows()\` received \`${JSON.stringify(receivedIndexTypes)}\`
but was expecting \`${JSON.stringify(expectedIndexTypes)}\`.
`)
  }

  if (baseIndexTypes.length === 0) {
    // This should never happen!
    throw new Error("There was an error while parsing index types.")
  }

  // NOTE: "range" index cannot be a part of a multi-index, i.e.
  // if the index type is "range", there will only be one element in the index array.
  if (baseIndexTypes[0].pandas_type === PandasIndexTypeName.RangeIndex) {
    // Continue the sequence for a "range" index.
    // NOTE: The metadata of the original index will be used, i.e.
    // if both indexes are of type "range" and they have different
    // metadata (start, step, stop) values, the metadata of the given
    // index will be ignored.
    const { step, stop } = baseIndexTypes[0].meta as PandasRangeIndex
    appendIndex = [
      range(
        stop,
        // End is not inclusive
        stop + appendIndex[0].length * step,
        step
      ),
    ]
  }

  // Concatenate each index with its counterpart in the other table
  const zipped = zip(baseIndex, appendIndex)
  // @ts-expect-error We know the two indexes are of the same size
  return zipped.map(a => a[0].concat(a[1]))
}

/** Concatenate the original DataFrame data with the given one. */
function concatData(
  baseData: Data,
  baseDataType: PandasColumnType[],
  appendData: Data,
  appendDataType: PandasColumnType[]
): Data {
  // If one of the `data` arrays is empty, return the other one.
  // Otherwise, they will have different types and an error will be thrown.
  if (appendData.numCols === 0) {
    return baseData
  }
  if (baseData.numCols === 0) {
    return appendData
  }

  // Make sure `data` arrays have the same types.
  if (!sameDataTypes(baseDataType, appendDataType)) {
    const receivedDataTypes = appendDataType.map(t => t.pandas_type)
    const expectedDataTypes = baseDataType.map(t => t.pandas_type)

    throw new Error(`
Unsupported operation. The data passed into \`add_rows()\` must have the same
data signature as the original data.

In this case, \`add_rows()\` received \`${JSON.stringify(receivedDataTypes)}\`
but was expecting \`${JSON.stringify(expectedDataTypes)}\`.
`)
  }

  // Remove extra columns from the "append" DataFrame.
  // Columns from appendData are used by index without checking column names.
  const slicedAppendData = appendData.selectAt(range(0, baseData.numCols))
  return baseData.concat(slicedAppendData)
}

/** Concatenate index and data types. */
function concatTypes(
  baseTypes: PandasColumnTypes,
  appendTypes: PandasColumnTypes
): PandasColumnTypes {
  const index = concatIndexTypes(baseTypes.index, appendTypes.index)
  const data = concatDataTypes(baseTypes.data, appendTypes.data)
  return { index, data }
}

/** Concatenate index types. */
function concatIndexTypes(
  baseIndexTypes: PandasColumnType[],
  appendIndexTypes: PandasColumnType[]
): PandasColumnType[] {
  // If one of the `types` arrays is empty, return the other one.
  // Otherwise, an empty array will be returned.
  if (appendIndexTypes.length === 0) {
    return baseIndexTypes
  }
  if (baseIndexTypes.length === 0) {
    return appendIndexTypes
  }

  // Make sure indexes have same types.
  if (!sameIndexTypes(baseIndexTypes, appendIndexTypes)) {
    const receivedIndexTypes = appendIndexTypes.map(index =>
      getTypeName(index)
    )
    const expectedIndexTypes = baseIndexTypes.map(index => getTypeName(index))

    throw new Error(`
Unsupported operation. The data passed into \`add_rows()\` must have the same
index signature as the original data.

In this case, \`add_rows()\` received \`${JSON.stringify(receivedIndexTypes)}\`
but was expecting \`${JSON.stringify(expectedIndexTypes)}\`.
`)
  }

  // TL;DR This sets the new stop value.
  return baseIndexTypes.map(indexType => {
    // NOTE: "range" index cannot be a part of a multi-index, i.e.
    // if the index type is "range", there will only be one element in the index array.
    if (indexType.pandas_type === PandasIndexTypeName.RangeIndex) {
      const { stop, step } = indexType.meta as PandasRangeIndex
      const {
        start: appendStart,
        stop: appendStop,
        step: appendStep,
      } = appendIndexTypes[0].meta as PandasRangeIndex
      const appendRangeIndexLength = (appendStop - appendStart) / appendStep
      const newStop = stop + appendRangeIndexLength * step
      return {
        ...indexType,
        meta: {
          ...indexType.meta,
          stop: newStop,
        },
      }
    }
    return indexType
  })
}

/** Concatenate types of data columns. */
function concatDataTypes(
  baseDataTypes: PandasColumnType[],
  appendDataTypes: PandasColumnType[]
): PandasColumnType[] {
  if (baseDataTypes.length === 0) {
    return appendDataTypes
  }

  return baseDataTypes
}

/** Concatenate the index, data, and types of parsed arrow tables. */
export function concat(
  baseTypes: PandasColumnTypes,
  baseIndex: IndexData,
  baseData: Data,
  appendTypes: PandasColumnTypes,
  appendIndex: IndexData,
  appendData: Data
): { index: IndexData; data: Data; types: PandasColumnTypes } {
  // Concatenate all data into temporary variables. If any of
  // these operations fail, an error will be thrown and we'll prematurely
  // exit the function.
  const index = concatIndexes(
    baseIndex,
    baseTypes.index,
    appendIndex,
    appendTypes.index
  )
  const data = concatData(
    baseData,
    baseTypes.data,
    appendData,
    appendTypes.data
  )
  const types = concatTypes(baseTypes, appendTypes)

  return { index, data, types }
}
