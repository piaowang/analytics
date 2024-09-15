/**
 * 专门用于查看图表数据功能的表格，附带导出数据功能
 */

import React, { Component } from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import { message } from 'antd'
import TableExpandAllRows from './table-expand-all-row'
import Alert from '../../Common/alert'
import { exportFile, isEqualWithFunc } from '../../../../common/sugo-utils'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import { URL_REGEX } from '../../../constants/string-constant'
import SizeProvider from '../../Common/size-provider'
import { defaultDimensionColumnFormatterGen } from '../../../common/echarts-option-generator'
import moment from 'moment'
import * as d3 from 'd3'
import PubSub from 'pubsub-js'
import classNames from 'classnames'
import { EMPTY_STRING, NULL_VALUE, RowKeyName } from '../../../../common/constants'
import { flattenData } from './flatten-druid-data'
import { withTableData } from './withTableData'
import { Anchor } from '../../Common/anchor-custom'

const dimColumnWidth = 150
const metricColumnWidth = 150
const dimColCellStyle = { maxWidth: dimColumnWidth - 17 }
const metricColCellStyle = { maxWidth: metricColumnWidth - 17 }

// export const withTableData = TableComponent => class extends Component {
//   static propTypes = {
//     style: PropTypes.object,
//     translationDict: PropTypes.object,
//     data: PropTypes.array,
//     dimensions: PropTypes.array,
//     metrics: PropTypes.array,
//     metricsFormatDict: PropTypes.object,
//     dimensionColumnFormatterGen: PropTypes.func
//   }

//   static defaultProps = {
//     metricsFormatDict: {},
//     dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
//   }

//   componentDidMount() {
//     // TODO 直接使用单图内置的导出功能
//     this.subToken = PubSub.subscribe('analytic.chart-data-table-export', () => {
//       let {dataSource, columns, dimensions} = this._table.props
//       if (_.isEmpty(dataSource)) {
//         message.warning('没有数据，无法导出')
//         return
//       }

//       this.handleDownloadAction(dataSource, columns, dimensions)
//     })
//   }

//   shouldComponentUpdate(nextProps) {
//     return !isEqualWithFunc(nextProps, this.props)
//   }

//   uidIndex = 0

//   componentWillUpdate() {
//     this.uidIndex = 0
//   }

//   componentWillUnmount() {
//     PubSub.unsubscribe(this.subToken)
//   }

//   handleDownloadAction(data, tableColumns, dimensions) {
//     data = flattenData(data, dimensions)

//     let sortedKeys = tableColumns.map(tCol => tCol.title)
//     let sortedRows = data.map(d => tableColumns.map(tCol => {
//       let render = tCol.render
//       let val = d[tCol.dataIndex]
//       if (render) {
//         const renderRes = render(val, d)
//         return renderRes === undefined ? '' : renderRes === '' ? '(空字符串)' : renderRes + ''
//       }
//       return val
//     }))

//     let content = d3.csvFormatRows([sortedKeys, ...sortedRows])
//     exportFile(`图表数据_${moment().format('YYYY-MM-DD')}.csv`, content)
//   }

//   groupToChildren(data) {
//     const keyMapper = (val, key) => _.isArray(val) || _.endsWith(key, '_GROUP') ? 'children' : key
//     const valMapper = val => _.isArray(val) ? this.groupToChildren(val) : val
//     return data.map(d => {
//       d = _.mapKeys(d, keyMapper)
//       d = _.mapValues(d, valMapper)
//       return {...d, [RowKeyName]: this.uidIndex++}
//     })
//   }

//   render() {
//     let {data, style, dimensions, metrics, translationDict, dimensionColumnFormatterGen, metricsFormatDict, ...rest} = this.props

//     if (!data || data.length === 0) {
//       return <Alert msg={'查无数据'} style={style} {...rest} />
//     }

//     let columns = dimensions.concat(metrics)

//     data = this.groupToChildren(data)

//     const formatOpts = {showComplete: true}
//     let dimFormatters = dimensions.map(dimName => dimensionColumnFormatterGen(dimName, formatOpts))
//     let applyDimFormatters = dimIndex => (val, record) => {
//       if (!record) {
//         return val
//       }
//       if (record.isTotalRow) {
//         return val || '(全局)'
//       }
//       let colFormatter = dimFormatters[dimIndex]
//       return colFormatter ? colFormatter(val) : val
//     }

//     const tableColumns = columns.map((k, i) => {
//       let translated = translationDict[k] || k
//       return {
//         axisName: k, // custom
//         // title: dimensions.length !== 0 && i === 0 ? <div className="elli" title={translated}>{translated}</div> : translated,
//         title: translated,
//         dataIndex: k,
//         key: k,
//         width: 150,
//         render: i < dimensions.length
//           ? applyDimFormatters(i)
//           : metricFormatterFactory(metricsFormatDict[k])
//       }
//     })

//     return (
//       <TableComponent
//         ref={ref => this._table = ref}
//         dimensions={dimensions}
//         metrics={metrics}
//         scroll={{x: '100%'}}
//         dataSource={data}
//         indentSize={5}
//         size="small"
//         bordered
//         style={style}
//         columns={tableColumns}
//         defaultExpandAllRows
//         {...rest}
//       />
//     )
//   }
// }

class SliceTableChart extends Component {
  render() {
    let { columns, dataSource, ...rest } = this.props
    // style = style || {}
    // style.height = style && _.isNumber(style.height) ? style.height - 40 : 'auto'

    let withSpanTitle = (val, isDimColumn) => {
      if (!isDimColumn || !URL_REGEX.test(val)) {
        return (
          <span className='elli itblock' style={isDimColumn ? dimColCellStyle : metricColCellStyle} title={val}>
            {val}
          </span>
        )
      }
      return (
        <Anchor className='elli itblock' href={val} style={isDimColumn ? dimColCellStyle : metricColCellStyle} title={val} target='_blank'>
          {val}
        </Anchor>
      )
    }

    let withSpanTitleForDimColumn = val => {
      if (val === '') {
        return <span className='color-999 elli'>{EMPTY_STRING}</span>
      }
      if (val === null) {
        return <span className='color-999 elli'>{NULL_VALUE}</span>
      }
      if (val === undefined) {
        return null
      }
      return withSpanTitle(val, true)
    }

    let myColumns = columns.map((col, i) => {
      return Object.assign({}, col, {
        title: (
          <div className='elli' style={{ width: (i === 0 && rest.dimensions.length !== 0 ? dimColumnWidth : metricColumnWidth) - 17 }}>
            {col.title}
          </div>
        ),
        render: i < rest.dimensions.length ? _.flow(col.render, withSpanTitleForDimColumn) : _.flow(col.render, withSpanTitle)
      })
    })

    let { isThumbnail } = this.props
    // 修正无法翻页的问题（可能是 antd 的 bug）
    const pagination = isThumbnail
      ? false
      : {
          showQuickJumper: false,
          showSizeChanger: false,
          total: dataSource.length,
          defaultPageSize: 101,
          pageSizeOptions: ['6', '11', '26', '51', '101'],
          showTotal: total => {
            if (0 === rest.dimensions.length) {
              return ''
            }
            let isFirstRowIsTotalRow = dataSource && dataSource[0] && dataSource[0].isTotalRow
            // 加载了 0 条时不显示提示语
            if ((isFirstRowIsTotalRow && total - 1 === 0) || total === 0) {
              return ''
            }
            return `加载了数据 ${isFirstRowIsTotalRow ? total - 1 : total} 条，需加载更多请点击第一维度并调整“显示条数”`
          }
        }

    return (
      <SizeProvider>
        {({ spWidth, spHeight }) => {
          // 列宽比 100% 大的话，启用水平滚动
          let contentWidth = dimColumnWidth + metricColumnWidth * (myColumns.length - 1)
          return (
            <TableExpandAllRows
              dataSource={dataSource}
              indentSize={5}
              size='small'
              bordered
              columns={myColumns}
              defaultExpandAllRows
              pagination={pagination}
              {...rest}
              className={classNames({ 'hide-pagination': dataSource.length <= 101 }, rest.className)}
              scroll={{
                x: contentWidth < spWidth ? '100%' : contentWidth,
                y: spHeight - (39 + (isThumbnail ? 0 : 46) + 4) /* table header, pagination, scroll bar */
              }}
            />
          )
        }}
      </SizeProvider>
    )
  }
}

export const sliceTableChart = withTableData('chart-data-table')(SliceTableChart)
