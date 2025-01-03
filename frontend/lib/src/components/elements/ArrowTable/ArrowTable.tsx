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

import React, { ReactElement } from "react"

import range from "lodash/range"

import { Quiver } from "@streamlit/lib/src/dataframes/Quiver"
import { format as formatArrowCell } from "@streamlit/lib/src/dataframes/arrowFormatUtils"

import {
  StyledEmptyTableCell,
  StyledTable,
  StyledTableBorder,
  StyledTableCell,
  StyledTableCellHeader,
  StyledTableContainer,
} from "./styled-components"

export interface TableProps {
  element: Quiver
}

export function ArrowTable(props: Readonly<TableProps>): ReactElement {
  const table = props.element
  const { cssId, cssStyles, caption } = table
  const { headerRows, rows, columns } = table.dimensions
  const allRows = range(rows)
  const columnHeaders = allRows.slice(0, headerRows)
  const dataRows = allRows.slice(headerRows)

  return (
    <StyledTableContainer className="stTable" data-testid="stTable">
      {cssStyles && <style>{cssStyles}</style>}
      {/* Add an extra wrapper with the border. This makes sure the border shows around
      the entire table when scrolling horizontally. See also `styled-components.ts`. */}
      <StyledTableBorder>
        <StyledTable id={cssId} data-testid="stTableStyledTable">
          {columnHeaders.length > 0 && (
            <thead>
              {columnHeaders.map(rowIndex =>
                generateTableRow(table, rowIndex, columns)
              )}
            </thead>
          )}
          <tbody>
            {dataRows.length === 0 ? (
              <tr>
                <StyledEmptyTableCell
                  data-testid="stTableStyledEmptyTableCell"
                  colSpan={columns || 1}
                >
                  empty
                </StyledEmptyTableCell>
              </tr>
            ) : (
              dataRows.map(rowIndex =>
                generateTableRow(table, rowIndex, columns)
              )
            )}
          </tbody>
        </StyledTable>
      </StyledTableBorder>
      {/* One negative side effect of having the border on a wrapper is that we need
      to put the caption outside of <table>, so it shows up outside of the border. This
      is not great for accessibility. But I think it's fine because adding captions
      isn't a native feature (you can only do it via Pandas Styler's `set_caption`
      function) and I couldn't find a single example on GitHub that actually does this
      for `st.table`. We might want to revisit this if we add captions/labels as a
      native feature or do a pass on accessibility. */}
      {caption && <caption>{caption}</caption>}
    </StyledTableContainer>
  )
}

function generateTableRow(
  table: Quiver,
  rowIndex: number,
  columns: number
): ReactElement {
  return (
    <tr key={rowIndex}>
      {range(columns).map(columnIndex =>
        generateTableCell(table, rowIndex, columnIndex)
      )}
    </tr>
  )
}

function generateTableCell(
  table: Quiver,
  rowIndex: number,
  columnIndex: number
): ReactElement {
  const {
    type,
    cssId,
    cssClass,
    content,
    contentType,
    displayContent,
    field,
  } = table.getCell(rowIndex, columnIndex)

  const formattedContent =
    displayContent || formatArrowCell(content, contentType, field)

  const { headerColumns } = table.dimensions
  const cellDataType =
    table.types.data[columnIndex - headerColumns]?.pandas_type
  const isNumeric = cellDataType === "int64" || cellDataType === "float64"

  const style: React.CSSProperties = {
    textAlign: isNumeric ? "right" : "left",
  }

  switch (type) {
    case "blank": {
      return (
        <StyledTableCellHeader key={columnIndex} className={cssClass}>
          &nbsp;
        </StyledTableCellHeader>
      )
    }
    case "index": {
      return (
        <StyledTableCellHeader
          key={columnIndex}
          scope="row"
          id={cssId}
          className={cssClass}
        >
          {formattedContent}
        </StyledTableCellHeader>
      )
    }
    case "columns": {
      return (
        <StyledTableCellHeader
          key={columnIndex}
          scope="col"
          className={cssClass}
          style={style}
        >
          {formattedContent}
        </StyledTableCellHeader>
      )
    }
    case "data": {
      return (
        <StyledTableCell key={columnIndex} id={cssId} style={style}>
          {formattedContent}
        </StyledTableCell>
      )
    }
    default: {
      throw new Error(`Cannot parse type "${type}".`)
    }
  }
}

export default ArrowTable
