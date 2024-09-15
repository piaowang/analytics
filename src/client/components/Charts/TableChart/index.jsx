import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button, message } from 'antd'
import _ from 'lodash'
import TableExpandAllRows from './table-expand-all-row'
import * as PubSub from 'pubsub-js'
import showPopover from '../../Common/free-popover'
import { withHashStateDec } from '../../Common/hash-connector'
import { reductions } from '../../../../common/sugo-utils'
import { withDataSourcesDec } from '../../Fetcher/data-source-fetcher'
import { withSizeProvider } from '../../Common/size-provider'
import { PermissionLink } from '../../../common/permission-control'
import AsyncHref from '../../Common/async-href'
import classNames from 'classnames'
import { insightUserById } from '../../../common/usergroup-helper'
import { RowKeyName } from '../../../../common/constants'
import { withTableData } from './withTableData'

function revealPath(tree, target) {
  if (tree === target) {
    return []
  }

  if (_.isArray(tree)) {
    let arrayIndex = _.findIndex(tree, leaf => revealPath(leaf, target))
    if (arrayIndex === -1) {
      return null
    }
    let nextLayerReveal = revealPath(tree[arrayIndex], target)
    if (nextLayerReveal === null) {
      return null
    }
    return [arrayIndex].concat(nextLayerReveal)
  }

  if (_.isObject(tree)) {
    let keyArray = _.keys(tree)
    let keyIndex = _.findIndex(keyArray, leafKey => revealPath(tree[leafKey], target))
    if (keyIndex === -1) {
      return null
    }
    let nextLayerReveal = revealPath(tree[keyArray[keyIndex]], target)
    if (nextLayerReveal === null) {
      return null
    }
    return [keyArray[keyIndex]].concat(nextLayerReveal)
  }
  return null
}

const CellType = {
  Total: 'Total',
  Dimension: 'Dimension',
  Metric: 'Metric'
}

@withHashStateDec(state => {
  return {
    filters: state.filters,
    dimensionExtraSettingDict: state.dimensionExtraSettingDict,
    selectedDataSourceId: state.selectedDataSourceId
  }
})
@withDataSourcesDec(() => ({ includeChild: true }), ds => ds.status !== 0)
@withSizeProvider
@withTableData('table')
class AnalyticTableChart extends Component {
  state = {
    pageSize: 101
  }

  getAllLayerValue(data, targetRecord) {
    let { dimensions } = this.props
    if (!dimensions.length) return []
    let mergedColName = dimensions.join(', ')

    // [i0, 'children', i1, 'children', i2, ...] =>
    // dataSource[i0][mergedColName], dataSource[i0].children[i1][mergedColName], dataSource[i0].children[i1].children[i2][mergedColName]

    let path = revealPath(data, targetRecord)
    let indexs = path.filter(p => _.isNumber(p))
    let indexReductions = reductions(indexs, (a, b) => a.concat([b]), [])
    return indexReductions
      .filter(arr => arr.length)
      .map(arr => {
        let leaf = arr.reduce((prev, curr) => (_.isArray(prev) ? prev[curr] : prev.children[curr]), data)
        if (leaf.isTotalRow) {
          return undefined
        }
        return leaf[mergedColName]
      })
      .filter(v => !_.isUndefined(v))
  }

  makeColumnSortableMapper = (tableCol, i) => {
    let { dimensions, dimensionExtraSettingDict, updateHashState } = this.props

    let { title, axisName, width: colWidth } = tableCol

    let currAxisNames = axisName.split(', ')

    let sortOfThisColumn = ''
    let doSortByThisColumn

    if (currAxisNames.length === 1) {
      // 如果全部维度都是按某个列进行升序/降序，则那个列显示排序信息
      if (_.every(dimensions, xAxisName => _.get(dimensionExtraSettingDict, `${xAxisName}.sortCol`) === axisName)) {
        let sortDirs = _.uniq(dimensions.map(xAxisName => _.get(dimensionExtraSettingDict, `${xAxisName}.sortDirect`))).filter(_.identity)
        if (sortDirs.length === 1) {
          sortOfThisColumn = sortDirs[0] === 'asc' ? '↑' : '↓'
        }
      }
      doSortByThisColumn = () => {
        let nextSortDirect = sortOfThisColumn !== '↓' ? 'desc' : 'asc'
        updateHashState({
          // 令全部维度都按此列 升序/降序
          dimensionExtraSettingDict: _.mapValues(dimensionExtraSettingDict, val => {
            return { ...val, sortCol: axisName, sortDirect: nextSortDirect }
          })
        })
      }
    } else if (1 < currAxisNames.length) {
      // 合并列的话，判断是否都是以自身升序/排序
      if (_.every(currAxisNames, axisName => _.get(dimensionExtraSettingDict, `${axisName}.sortCol`) === axisName)) {
        let sortDirs = _.uniq(dimensions.map(xAxisName => _.get(dimensionExtraSettingDict, `${xAxisName}.sortDirect`))).filter(_.identity)
        if (sortDirs.length === 1) {
          sortOfThisColumn = sortDirs[0] === 'asc' ? '↑' : '↓'
        }
      }
      doSortByThisColumn = () => {
        let nextSortDirect = sortOfThisColumn !== '↓' ? 'desc' : 'asc'
        updateHashState({
          // 令全部维度都按自身 升序/降序
          dimensionExtraSettingDict: _.mapValues(dimensionExtraSettingDict, (val, key) => {
            return { ...val, sortCol: key, sortDirect: nextSortDirect }
          })
        })
      }
    }
    return {
      ...tableCol,
      title:
        dimensions.length && !_.startsWith(tableCol.dataIndex, '_localMetric_') ? (
          <div className='pointer elli' onClick={doSortByThisColumn} style={{ width: colWidth - 17 }} title={tableCol.title}>
            {tableCol.title + sortOfThisColumn}
          </div>
        ) : (
          <div style={{ width: colWidth - 17 }} title={tableCol.title} className='elli'>
            {tableCol.title}
          </div>
        )
    }
  }

  makeMetricalFieldInsightable = (tableCol, i) => {
    if (i !== 0) {
      return tableCol
    }

    let { selectedDataSourceId, dataSources, dimensions, filters } = this.props
    let dbDataSource = _.find(dataSources, ds => ds.id === selectedDataSourceId)
    if (!dbDataSource || !dbDataSource.params) {
      return tableCol
    }

    let { commonMetric = [], commonDimensions = [], commonSession } = dbDataSource.params
    let usingMetricalFields = _.intersection(dimensions, commonMetric)
    if (!usingMetricalFields.length) {
      return tableCol
    }
    let metricalFieldsSet = new Set(usingMetricalFields)

    let onInsightLinkClick = ev => {
      ev.stopPropagation()
      if (!commonDimensions || !commonDimensions[0]) {
        message.warn(
          <span>
            请先在<PermissionLink to='/console/project/datasource-settings'>场景数据设置</PermissionLink>配置好 用户行为维度
          </span>,
          8
        )
        return
      }
      if (!commonSession) {
        message.warn(
          <span>
            请先在<PermissionLink to='/console/project/datasource-settings'>场景数据设置</PermissionLink>配置好 SessionID
          </span>,
          8
        )
        return
      }
      // let field = ev.currentTarget.getAttribute('data-field')
      let fieldValue = ev.currentTarget.getAttribute('data-field-value')
      /*      let query = {
        datasource: selectedDataSourceId,
        groupby: field,
        id: `__temp_${field}_${fieldValue}`,
        user: fieldValue,
        datetype: encodeURI(JSON.stringify(filters[0] ? filters[0].eq : {}))
      }
      browserHistory.push(`/console/insight?${toQueryParams(query)}`)*/
      insightUserById(fieldValue)
    }

    // 修改 render，如果是 render 出的值是统计字段的值，则生成一个连接去细查的超链接
    let prevRender = tableCol.render || _.identity
    return {
      ...tableCol,
      render: (val, record, index) => {
        if (!record || record.isTotalRow) {
          return prevRender(val, record, index)
        }
        let { __dimensionIndex } = record
        let dim = dimensions[__dimensionIndex]
        //子数据源不可以细查
        if (metricalFieldsSet.has(dim) && !dbDataSource.parent_id) {
          return (
            <a className='pointer' onClick={onInsightLinkClick} data-field={dimensions[__dimensionIndex]} data-field-value={record[dimensions[__dimensionIndex]]}>
              {prevRender(val, record, index)}
            </a>
          )
        }
        return prevRender(val, record, index)
      }
    }
  }

  makeCellClickHandler = (tableCol, idx) => {
    // 点击维度列后能够添加维度值到"筛选"、点击指标列后能够添加维度值 + 指标的筛选条件 到"筛选"
    let { dimensions, metrics, dataSource } = this.props

    let { dataIndex: colName } = tableCol

    return {
      ...tableCol,
      onCellClick: (record, ev) => {
        let cleanUp
        let cellType = dimensions.length === 0 || 0 < idx ? CellType.Metric : record.isTotalRow || record[RowKeyName] === 0 ? CellType.Total : CellType.Dimension

        let onSelectTableVal = ev => {
          let selectType = ev.currentTarget.getAttribute('data-select-type')

          let dimVals = this.getAllLayerValue(dataSource, record)
          switch (cellType) {
            case CellType.Dimension: {
              PubSub.publishSync('analytic.select-multi-dimension-value', { dimVals, selectType })
              cleanUp()
              break
            }
            case CellType.Metric: {
              let dimVals = this.getAllLayerValue(dataSource, record)
              let metricIdx = idx - dimensions.length
              let metricName = metrics[metricIdx]
              PubSub.publishSync('analytic.select-multi-dimension-value', { dimVals, metricName, selectType })
              cleanUp()
              break
            }
            default:
              break
          }
        }
        let content = (
          <div className='width250 aligncenter'>
            <Button className='mg1r' disabled={cellType === CellType.Total} data-select-type='include' onClick={onSelectTableVal}>
              选择
            </Button>

            <Button className='mg1r' disabled={cellType === CellType.Total} data-select-type='exclude' onClick={onSelectTableVal}>
              排除
            </Button>

            <AsyncHref
              target='_blank'
              initFunc={() => {
                return new Promise((resolve, reject) => {
                  switch (cellType) {
                    case CellType.Dimension: {
                      let dimVals = this.getAllLayerValue(dataSource, record)
                      PubSub.publishSync('analytic.generate-inspect-source-data-url', { dimVals, urlCallback: resolve })
                      break
                    }
                    case CellType.Metric: {
                      let dimVals = this.getAllLayerValue(dataSource, record)
                      let metricIdx = idx - dimensions.length
                      let metricName = metrics[metricIdx]
                      PubSub.publishSync('analytic.generate-inspect-source-data-url', {
                        dimVals,
                        metricName,
                        urlCallback: resolve
                      })
                      break
                    }
                    case CellType.Total:
                      PubSub.publishSync('analytic.generate-inspect-source-data-url', { urlCallback: resolve })
                      break
                    default:
                      reject('Unknown cell type.')
                      break
                  }
                })
              }}
            >
              {({ isPending }) => {
                return (
                  <Button type='primary' className={classNames({ 'ignore-mouse': isPending })} onClick={cleanUp}>
                    查看源数据
                  </Button>
                )
              }}
            </AsyncHref>
          </div>
        )
        let td = ev.target
        cleanUp = showPopover(td, content, undefined, { backgroundColor: 'rgba(0, 0, 0, 0.25)' })
      }
    }
  }

  render() {
    let { style, columns, dataSource, dimensions, dimensionExtraSettingDict, updateHashState, spWidth, spHeight, ...rest } = this.props
    let { pageSize } = this.state

    let myColumns = columns.map(this.makeMetricalFieldInsightable).map(this.makeColumnSortableMapper).map(this.makeCellClickHandler)

    let pagination = {
      showQuickJumper: false,
      showSizeChanger: false,
      pageSize,
      onShowSizeChange: (curr, size) => {
        this.setState({ pageSize: size })
      },
      pageSizeOptions: ['6', '11', '26', '51', '101'],
      showTotal: total => {
        if (0 === dimensions.length) {
          return ''
        }
        let isFirstRowIsTotalRow = dataSource && dataSource[0] && dataSource[0].isTotalRow
        // 加载了 0 条时不显示提示语
        if ((isFirstRowIsTotalRow && total - 1 === 0) || total === 0) {
          return ''
        }
        return `加载了数据 ${isFirstRowIsTotalRow ? total - 1 : total} 条；需加载更多请点击第一维度并调整“显示数量”`
      }
    }
    // 列宽比 100% 大的话，启用水平滚动
    let contentWidth = _.sum(myColumns.map(col => col.width))
    return (
      <TableExpandAllRows
        dataSource={dataSource}
        indentSize={5}
        size='small'
        bordered
        style={style}
        columns={myColumns}
        defaultExpandAllRows
        pagination={pagination}
        {...rest}
        scroll={{ x: contentWidth < spWidth ? '100%' : contentWidth, y: spHeight - 81 }}
        className={classNames({ 'hide-pagination': dataSource.length <= 101 }, rest.className)}
      />
    )
  }
}

export const analyticTableChart = AnalyticTableChart

@withSizeProvider
@withTableData('table')
class SliceTableChart extends Component {
  render() {
    let { columns, dataSource, spWidth, spHeight, slice, ...rest } = this.props
    // style = style || {}
    // style.height = style && _.isNumber(style.height) ? style.height - 40 : 'auto'
    //大屏预警功能
    let params = _.get(slice, 'params')
    let warnList = params.warnList || []

    let myColumns = columns.map((col, i) => {
      let getOneWarn = _.find(warnList, { indexTitle: col.key })

      return Object.assign({}, col, {
        sorter: (a, b) => {
          let x = _.get(a, col.dataIndex, 0)
          let y = _.get(b, col.dataIndex, 0)
          return _.isString(x) ? x.localeCompare(y) : x - y
        },
        title: (
          <span className='iblock elli' style={{ width: col.width - 22 - 17 }}>
            {col.title}
          </span>
        ),
        render: _.flow(col.render, val => {
          let warnColor = ''
          if (!_.isEmpty(getOneWarn) && _.isNumber(val)) {
            if (getOneWarn.warnOp === '0' && val < getOneWarn.warnValue) {
              warnColor = getOneWarn.warnColor
            } else if (getOneWarn.warnOp === '1' && val === getOneWarn.warnValue) {
              warnColor = getOneWarn.warnColor
            } else if (getOneWarn.warnOp === '2' && val > getOneWarn.warnValue) {
              warnColor = getOneWarn.warnColor
            } else {
              warnColor = ''
            }
          }
          return <span style={{ color: warnColor }}>{val}</span>
        })
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
            return `加载了数据 ${isFirstRowIsTotalRow ? total - 1 : total} 条`
          }
        }

    // 列宽比 100% 大的话，启用水平滚动
    let contentWidth = _.sum(myColumns.map(col => col.width))
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
  }
}

export const sliceTableChart = SliceTableChart
