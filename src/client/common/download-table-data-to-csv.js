/**
 * 下载某个表格的数据，csv 格式
 * 注意：不支持树状表格
 * Created by heganjie on 2017/3/29.
 */

import _ from 'lodash'
import * as d3 from 'd3'
import {exportFile, dictBy} from '../../common/sugo-utils'
import moment from 'moment'

export default function downloadTableData(tableRef, fileTitle, type='table') {
  let {columns, dataSource} = tableRef.props
  let header = genHeader(columns)
  let headerDataIdx = columns.map(c => c.dataIndex)
  let rendererDict = dictBy(columns.filter(c => c.render), c => c.dataIndex, c => c.render)

  let sortedRows = dataSource.map(d => {
    return headerDataIdx.map((k, i) => {
      if (k in rendererDict) {
        let res = rendererDict[k](d[k], d, i)
        return genResult(res, type)
      }
      return d[k]
    })
  })
  let content = d3.csvFormatRows([header, ...sortedRows])
  exportFile(`${fileTitle}_${moment().format('YYYY-MM-DD')}.csv`, content)
}

function genHeader(columns) {
  return columns.map(c => _.isString(c.title) ? c.title : c.title.props.children)
}

function genResult(res, type) {
  if (type==='flat-table') return res.props.children
  return _.isObject(res) ? res.children : res
}