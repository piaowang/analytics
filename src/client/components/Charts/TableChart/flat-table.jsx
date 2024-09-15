import React, { Component } from 'react'
import PropTypes from 'prop-types'
import { Button, message } from 'antd'
import _ from 'lodash'
import TableExpandAllRows from './table-expand-all-row'
import * as PubSub from 'pubsub-js'
import showPopover from '../../Common/free-popover'
import { withHashStateDec } from '../../Common/hash-connector'
import Alert from '../../Common/alert'
import { isEqualWithFunc } from '../../../../common/sugo-utils'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import { URL_REGEX } from '../../../constants/string-constant'
import { withDataSourcesDec } from '../../Fetcher/data-source-fetcher'
import { withSizeProvider } from '../../Common/size-provider'
import { PermissionLink } from '../../../common/permission-control'
import { defaultDimensionColumnFormatterGen } from '../../../common/echarts-option-generator'
import AsyncHref from '../../Common/async-href'
import classNames from 'classnames'
import { insightUserById } from '../../../common/usergroup-helper'
import { EMPTY_STRING, NULL_VALUE, RESPONSIVE_PAGE_MAX_WIDTH, RowKeyName } from '../../../../common/constants'
import CustomHeader, { getAllDataColumnsPath } from '../CustomHeaderTable/custom-header-modal'
import { withTableData } from './withTableData'

export function enablePropsOverwriter(Component, funcName = 'optionsOverwriter') {
  return props => <Component {...(_.isFunction(props[funcName]) ? props[funcName](props) : props)} />
}

const TableExpandAllRowsEnablePropsOverwriter = enablePropsOverwriter(TableExpandAllRows)

const CellType = {
  Total: 'Total',
  Dimension: 'Dimension',
  Metric: 'Metric'
}

const changeProps = () => ({ includeChild: true })

@withHashStateDec(state => {
  return {
    filters: state.filters,
    dimensionExtraSettingDict: state.dimensionExtraSettingDict,
    selectedDataSourceId: state.selectedDataSourceId
  }
})
@withDataSourcesDec(changeProps, ds => ds.status !== 0)
@withSizeProvider
@withTableData('flat-table')
class AnalyticTableChart extends Component {
  state = {
    pageSize: 101,
    disableCustomHeaderModal: false,
    colmunsProps: []
  }

  getAllLayerValue(data, targetRecord, currDimIndex) {
    if (targetRecord.isTotalRow) {
      return []
    }
    let { dimensions } = this.props
    if (currDimIndex === undefined) {
      return dimensions.map(dimName => targetRecord[dimName])
    }
    let valArr = new Array(dimensions.length)
    valArr[currDimIndex] = targetRecord[dimensions[currDimIndex]]
    return valArr
  }

  makeColumnSortableMapper = (tableCol, i, columns) => {
    let { dimensions, dimensionExtraSettingDict, updateHashState, spWidth } = this.props

    let { title, axisName, width: colWidth } = tableCol

    let sortOfThisColumn = ''
    let doSortByThisColumn

    let orderByColName = _.get(dimensionExtraSettingDict, `${dimensions[0]}.sortCol`)
    if (dimensions[0] && orderByColName === axisName) {
      let sortDir = _.get(dimensionExtraSettingDict, `${dimensions[0]}.sortDirect`)
      if (sortDir) {
        sortOfThisColumn = sortDir === 'asc' ? '↑' : '↓'
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

    return {
      ...tableCol,
      title:
        dimensions.length && !_.startsWith(tableCol.dataIndex, '_localMetric_') ? (
          <div onClick={doSortByThisColumn} className='iblock pointer elli' style={{ width: colWidth - 17 }} title={tableCol.title}>
            {tableCol.title + sortOfThisColumn}
          </div>
        ) : (
          <div className='iblock elli' style={{ width: colWidth - 17 }} title={tableCol.title}>
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
        let dim = dimensions[i]
        //子数据源不可以细查
        if (metricalFieldsSet.has(dim) && !dbDataSource.parent_id) {
          return (
            <a className='pointer' onClick={onInsightLinkClick} data-field={dim} data-field-value={record[dim]}>
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
        let cellType = dimensions.length <= idx ? CellType.Metric : record.isTotalRow || record[RowKeyName] === 0 ? CellType.Total : CellType.Dimension

        let cleanUp
        let onSelectTableVal = ev => {
          let selectType = ev.currentTarget.getAttribute('data-select-type')

          switch (cellType) {
            case CellType.Dimension: {
              let dimVals = this.getAllLayerValue(dataSource, record, idx)
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
                      let dimVals = this.getAllLayerValue(dataSource, record, idx)
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
    let { style, columns, dataSource, dimensions, spWidth, spHeight, dimensionExtraSettingDict, updateHashState, onSettingsChange, slice, ...rest } = this.props
    let { pageSize, disableCustomHeaderModal } = this.state
    let myColumns = []
    const isCustomHeader = _.get(slice, 'params.chartExtraSettings.isCustomHeader', false)
    if (isCustomHeader) {
      const customColumns = _.get(slice, 'params.chartExtraSettings.customColumns', [])
      columns = _.cloneDeep(customColumns)
      const customDataColumnsPath = getAllDataColumnsPath(columns)
      myColumns = customDataColumnsPath
        .map(p => _.get(columns, p, {}))
        .map(this.makeMetricalFieldInsightable)
        .map(this.makeColumnSortableMapper)
        .map(this.makeCellClickHandler)
      _.forEach(myColumns, (p, i) => {
        _.set(columns, customDataColumnsPath[i], p)
      })
      myColumns = columns
    } else {
      myColumns = columns.map(this.makeMetricalFieldInsightable).map(this.makeColumnSortableMapper).map(this.makeCellClickHandler)
    }

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

    let contentWidth = _.sum(myColumns.map(col => col.width))
    return [
      <div key='btn' className='alignright mg1b pointer'>
        {' '}
        <Button onClick={() => this.setState({ disableCustomHeaderModal: true })}>编辑表头</Button>{' '}
      </div>,
      <TableExpandAllRows
        key='table'
        dataSource={dataSource}
        indentSize={5}
        size='small'
        bordered
        style={style}
        columns={myColumns}
        defaultExpandAllRows
        pagination={pagination}
        {...rest}
        className={classNames({ 'hide-pagination': dataSource.length <= 101 }, rest.className)}
        scroll={{ x: contentWidth < spWidth ? '100%' : contentWidth, y: spHeight - 81 }}
        isSlice={false}
      />,
      disableCustomHeaderModal ? (
        <CustomHeader
          columns={myColumns}
          visible={disableCustomHeaderModal}
          hide={() => this.setState({ disableCustomHeaderModal: false })}
          change={obj => {
            onSettingsChange({
              customColumns: obj,
              isCustomHeader: true
            })
            this.setState({ disableCustomHeaderModal: false })
          }}
        />
      ) : null
    ]
  }
}

export const analyticFlatTableChart = AnalyticTableChart

@withSizeProvider
@withTableData('flat-table')
class SliceTableChart extends Component {
  render() {
    let { columns, dataSource, spWidth, spHeight, slice, isThumbnail, ...rest } = this.props
    // style = style || {}
    // style.height = style && _.isNumber(style.height) ? style.height - 40 : 'auto'
    //大屏预警功能
    let params = _.get(slice, 'params')
    const isCustomHeader = _.get(params, 'chartExtraSettings.isCustomHeader', false)
    let warnList = params.warnList || []

    let myColumns = []
    // 列宽比 100% 大的话，启用水平滚动
    let contentWidth = 0

    // 自定义表头，不支持排序
    if (isCustomHeader) {
      const customColumns = _.get(slice, 'params.chartExtraSettings.customColumns', [])
      const sliceColumns = _.cloneDeep(customColumns)
      const customDataColumnsPath = getAllDataColumnsPath(sliceColumns)
      myColumns = customDataColumnsPath.map(p => _.get(sliceColumns, p, {}))
      _.forEach(myColumns, (p, i) => {
        _.set(sliceColumns, customDataColumnsPath[i], p)
      })
      myColumns = sliceColumns
      contentWidth = _.sum(customDataColumnsPath.map(p => _.get(sliceColumns, `${p}.width`, 0)))
    } else {
      // 未自定义表头，需支持排序
      contentWidth = _.sum(myColumns.map(col => col.width))
      myColumns = columns.map((col, i) => {
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
          render: val => {
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
          }
        })
      })
    }

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

    return (
      <TableExpandAllRowsEnablePropsOverwriter
        rowKey={i => i.key} //本来在下层的rowkeyname是key值 但是此处没生效
        dataSource={dataSource.map((i, idx) => ({ ...i, key: idx }))}
        indentSize={5}
        size='small'
        bordered
        columns={myColumns}
        defaultExpandAllRows
        pagination={pagination}
        {...rest}
        className={classNames('flat-table', 'always-display-scrollbar-horizontal-all', { 'hide-pagination': dataSource.length <= 101 }, rest.className)}
        scroll={{
          x: contentWidth < spWidth ? '100%' : contentWidth,
          y: spHeight - (39 + (isThumbnail ? 0 : 46) + 4) /* table header, pagination, scroll bar */
        }}
      />
    )
  }
}

export const sliceFlatTableChart = SliceTableChart
