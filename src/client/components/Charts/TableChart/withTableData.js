
import React, {Component} from 'react'
import PropTypes from 'prop-types'
import {EMPTY_STRING, NULL_VALUE, RESPONSIVE_PAGE_MAX_WIDTH, RowKeyName} from '../../../../common/constants'
import {defaultDimensionColumnFormatterGen} from '../../../common/echarts-option-generator'
import {
  dictBy,
  isEqualWithFunc,
  exportFile
} from '../../../../common/sugo-utils'
import metricFormatterFactory from '../../../common/metric-formatter-factory'
import {URL_REGEX} from '../../../constants/string-constant'
import { getAllDataColumnsPath } from '../CustomHeaderTable/custom-header-modal'
import Alert from '../../Common/alert'
import _ from 'lodash'
import { message } from 'antd'
import PubSub from 'pubsub-js'
import {flattenData} from './flatten-druid-data'
import moment from 'moment'
import * as d3 from 'd3'


export const withTableData = type => {

  const dimColumnMinWidth = window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH
    ? 130
    : (type === 'flat-table' ? 150 : 300)
  const metricColumnMinWidth = window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH ? 195 : 150

  const calcColumnWidth = (tableWidth, colCount, minWidth = 150) => {
    if (colCount <= 1) {
      return tableWidth
    }
    return Math.max(Math.floor(tableWidth / colCount), minWidth)
  }

  return TableComponent => class WithTableData extends Component {
    static propTypes = {
      style: PropTypes.object,
      translationDict: PropTypes.object,
      data: PropTypes.array,
      dimensions: PropTypes.array,
      metrics: PropTypes.array,
      metricsFormatDict: PropTypes.object,
      dimensionColumnFormatterGen: PropTypes.func
    }
  
    static defaultProps = {
      metricsFormatDict: {},
      dimensionColumnFormatterGen: defaultDimensionColumnFormatterGen
    }
  
    componentDidMount() {
      // TODO 直接使用单图内置的导出功能
      if (type === 'chart-data-table') {
        WithTableData.subToken = PubSub.subscribe('analytic.chart-data-table-export', () => {
          let {dataSource, columns, dimensions} = this._table.props
          if (_.isEmpty(dataSource)) {
            message.warning('没有数据，无法导出')
            return
          }
    
          WithTableData.handleDownloadAction(dataSource, columns, dimensions)
        })
      }
    }

    shouldComponentUpdate(nextProps) {
      return !isEqualWithFunc(nextProps, this.props)
    }
  
    static uidIndex = 0
    // uidIndex = 0
  
    componentWillUpdate() {
      // this.uidIndex = 0
      WithTableData.uidIndex = 0
    }

    componentWillUnmount() {
      PubSub.unsubscribe(WithTableData.subToken)
    }

    static handleDownloadAction(data, tableColumns, dimensions) {
      data = flattenData(data, dimensions)
  
      let sortedKeys = tableColumns.map(tCol => tCol.title)
      let sortedRows = data.map(d => tableColumns.map(tCol => {
        let render = tCol.render
        let val = d[tCol.dataIndex]
        if (render) {
          const renderRes = render(val, d)
          return renderRes === undefined ? '' : renderRes === '' ? '(空字符串)' : renderRes + ''
        }
        return val
      }))
  
      let content = d3.csvFormatRows([sortedKeys, ...sortedRows])
      exportFile(`图表数据_${moment().format('YYYY-MM-DD')}.csv`, content)
    }

    static genChartDataTableColumns({
      columns,
      translationDict,
      dimensions,
      metricsFormatDict,
      dimensionColumnFormatterGen
    }) {

      const formatOpts = {showComplete: true}
      let dimFormatters = dimensions.map(dimName => dimensionColumnFormatterGen(dimName, formatOpts))
      let applyDimFormatters = dimIndex => (val, record) => {
        if (!record) {
          return val
        }
        if (record.isTotalRow) {
          return val || '(全局)'
        }
        let colFormatter = dimFormatters[dimIndex]
        return colFormatter ? colFormatter(val) : val
      }

      return columns.map((k, i) => {
        let translated = translationDict[k] || k
        return {
          axisName: k, // custom
          // title: dimensions.length !== 0 && i === 0 ? <div className="elli" title={translated}>{translated}</div> : translated,
          title: translated,
          dataIndex: k,
          key: k,
          width: 150,
          render: i < dimensions.length
            ? applyDimFormatters(i)
            : metricFormatterFactory(metricsFormatDict[k])
        }
      })
    }
  
    static genFlatTableColumns({
      columns,
      translationDict,
      dimensions,
      metricsFormatDict,
      dimensionColumnFormatterGen,
      isCustomHeader,
      settings = {},
      rest
    }) {
  
      // 18 为 ie 的垂直滚动条宽度
      const scrollbarWidth = window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH ? 0 : 18
      let dimColumnWidth = calcColumnWidth((rest.spWidth || 150) - scrollbarWidth, columns.length, dimColumnMinWidth)
      let metricColumnWidth = calcColumnWidth((rest.spWidth || 150) - scrollbarWidth, columns.length, metricColumnMinWidth)
  
      const formatOpts = {showComplete: true}
  
      let dimFormatters = dimensions.map(dimName => dimensionColumnFormatterGen(dimName, formatOpts))
      
      let applyDimFormatters = dimIndex => (val, record) => {
        if (!record) {
          return val
        } else if (record.isTotalRow) {
          let obj = {
            // 记载有 "全局" 的那一个属性的 props 是维度名称的 join
            children: dimIndex === 0 ? record[dimensions.join(', ')] : null,
            props: {
              colSpan: dimensions.length
            }
          }
          if (dimIndex !== 0) {
            obj.props.colSpan = 0
          }
          return obj
        } else {
          let colFormatter = dimFormatters[dimIndex]
          return colFormatter ? colFormatter(val) : val
        }
      }
  
      let { customColumns = [] } = settings
      const customDataColumnsPath = getAllDataColumnsPath(customColumns)
  
      let tableColumns = (isCustomHeader ? customDataColumnsPath.map(p => _.get(customColumns, `${p}.dataIndex`, '')) : columns).map((k, i) => {
        let translated = translationDict[k] || k
        let currColumnWidth = i < dimensions.length ? dimColumnWidth : metricColumnWidth
  
        let colSpanStyle = {width: currColumnWidth - 17}
  
        let withSpanWrapper = (val) => {
          if (_.isObject(val)) {
            // 总计行才会触发
            let colSpan = val.props && val.props.colSpan
            if (!colSpan) {
              return val
            }
            return {
              ...val,
              children: (
                <span
                  className='elli itblock'
                  style={{width: (currColumnWidth * colSpan) - 17}}
                  title={val.children}
                >{val.children}</span>
              )
            }
          }
          if (URL_REGEX.test(val)) {
            return (
              <a
                className='elli itblock'
                style={{width: currColumnWidth - 50}}
                title={val}
                href={val}
                target='_blank'
              >{val}</a>
            )
          }
          return (
            <span
              className='elli itblock'
              style={colSpanStyle}
              title={val}
            >{val}</span>
          )
        }
  
        let withSpanWrapperForDimColumn = val => {
          if (val === '') {
            return <span className='color-999 elli'>{EMPTY_STRING}</span>
          }
          if (val === null || val === undefined) {
            return <span className='color-999 elli'>{NULL_VALUE}</span>
          }
          return withSpanWrapper(val)
        }
        return {
          axisName: k, // custom
          title: translated,
          dataIndex: k,
          key: k,
          width: currColumnWidth,
          // 移动端固定维度列
          fixed: window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH && i < dimensions.length,
          render: i < dimensions.length
            ? _.flow(applyDimFormatters(i), withSpanWrapperForDimColumn)
            : _.flow(metricFormatterFactory(metricsFormatDict[k]), withSpanWrapper)
        }
      })
  
      if(isCustomHeader) {
        customColumns = _.cloneDeep(customColumns)
        _.forEach(tableColumns, (p, i) => {
          _.set(customColumns, customDataColumnsPath[i], p)
        })
        tableColumns = customColumns
      }
  
      return tableColumns
    }
  
    static genTableColumns({
      columns, 
      translationDict,
      dimensions, 
      metricsFormatDict,
      dimensionColumnFormatterGen,
      isCustomHeader,
      settings,
      rest
    }) {
      if (type === 'flat-table') {
        return WithTableData.genFlatTableColumns({
          columns,
          translationDict,
          dimensions,
          metricsFormatDict,
          dimensionColumnFormatterGen,
          isCustomHeader,
          settings,
          rest
        })
      }

      if (type === 'chart-data-table') {
        return WithTableData.genChartDataTableColumns({
          columns,
          translationDict,
          dimensions,
          metricsFormatDict,
          dimensionColumnFormatterGen
        })
      }
      const dict = {
        ...translationDict,
        [dimensions.join(', ')]: dimensions.map(n => translationDict[n] || n).join(', ')
      }
      const formatOpts = {showComplete: true}
      let dimFormatters = dimensions.map(dimName => dimensionColumnFormatterGen(dimName, formatOpts))
      let applyDimFormatters = (val, record) => {
        if (!record || record.isTotalRow) {
          return val
        } else {
          let {__dimensionIndex} = record
          let colFormatter = dimFormatters[__dimensionIndex]
          return colFormatter ? colFormatter(val) : val
        }
      }
      // 18 为 ie 的垂直滚动条宽度
      let dimColumnWidth = calcColumnWidth(rest.spWidth || 150 - 18, columns.length, dimColumnMinWidth)
      let metricColumnWidth = calcColumnWidth(rest.spWidth || 150 - 18, columns.length, metricColumnMinWidth)
      return columns.map((k, i) => {
        let translated = dict[k] || k
        let colWidth = i === 0 && dimensions.length !== 0 ? dimColumnWidth : metricColumnWidth
  
        let metricColSpanStyle = {width: colWidth - 17}
        let dimColSpanStyle = {maxWidth: colWidth - 17}
        let withSpanTitle = (val, isDimCol) => {
          if (!isDimCol || !URL_REGEX.test(val)) {
            return (
              <span className='elli itblock' style={isDimCol ? dimColSpanStyle : metricColSpanStyle} title={val}>{val}</span>
            )
          }
          return (
            <a
              className='elli itblock'
              style={{maxWidth: colWidth - 50}}
              href={val}
              title={val}
              target='_blank'
            >{val}</a>
          )
        }
  
        let withSpanTitleForDimColumn = val => {
          if (val === '') {
            return <span className='color-999 elli'>{EMPTY_STRING}</span>
          }
          if (val === null || val === undefined) {
            return <span className='color-999 elli'>{NULL_VALUE}</span>
          }
          return withSpanTitle(val, true)
        }
  
        return {
          axisName: k, // custom
          // title: dimensions.length !== 0 && i === 0 ? <div className="elli" title={translated}>{translated}</div> : translated,
          title: translated,
          // 移动端固定维度列
          fixed: window.outerWidth < RESPONSIVE_PAGE_MAX_WIDTH && i === 0 && dimensions.length !== 0,
          dataIndex: k,
          key: k,
          width: colWidth,
          render: dimensions.length && i === 0
            ? _.flow(applyDimFormatters, withSpanTitleForDimColumn)
            : _.flow(metricFormatterFactory(metricsFormatDict[k]), withSpanTitle)
        }
      })
    }
  
    static genIsCustomHeader(settings = {}) {
      let { customColumns = [] } = settings
      return !!customColumns.length
    }
  
    static genData(data, dimensions, columns) {
      let result = WithTableData.mergeDimensionColumns(data, dimensions)
      result = WithTableData.groupToChildren(result, columns, dictBy(columns, _.identity, () => ''))
      return result
    }
  
    static groupToChildren(data, columns, allColumnWithEmptyString) {
      const keyMapper = (val, key) => _.isArray(val) ? 'children' : key
      const valMapper = val => _.isArray(val) ? WithTableData.groupToChildren(val, columns, allColumnWithEmptyString) : val
      return data.map(d => {
        d = _.mapKeys(d, keyMapper)
        d = _.mapValues(d, valMapper)
        return {...allColumnWithEmptyString, ...d, [RowKeyName]: WithTableData.uidIndex++}
      })
    }
  
    static mergeDimensionColumns(data, dimensions = []) {
      if (0 === dimensions.length) {
        return data
      }
      let mergedColumn = dimensions.join(', ')
  
      function recurAppendMergedColumn(data0, dimensionIndex) {
        const valMapper = val => _.isArray(val) ? recurAppendMergedColumn(val, dimensionIndex + 1) : val
        return data0.map(d => {
          if (d.isTotalRow) {
            return d
          }
          d = {...d, __dimensionIndex: dimensionIndex, [mergedColumn]: d[dimensions[dimensionIndex]]}
          return _.mapValues(d, valMapper)
        })
      }
  
      return recurAppendMergedColumn(data, 0)
    }
  
    render() {
      let {data, style, dimensions, metrics, translationDict, dimensionColumnFormatterGen, metricsFormatDict, settings, ...rest} = this.props
  
      if (!data || data.length === 0) {
        return <Alert msg={'查无数据'} style={style} {...rest} />
      }
  
      const isCustomHeader = WithTableData.genIsCustomHeader({ settings })
  
      const dealMap = {
        'table' : {
          columns: dimensions.length !== 0 ? [dimensions.join(', ')].concat(metrics) : metrics,
          data: WithTableData.genData(data, dimensions, this.columns)
        },
        'flat-table': {
          columns: [...dimensions, ...metrics],
          data: data
        },
        'chart-data-table': {
          columns: dimensions.concat(metrics),
          data: WithTableData.genData(data)
        }
      }
  
      const columns = dealMap[type].columns
      const newData = dealMap[type].data
  
      const tableColumns = WithTableData.genTableColumns({
        columns, 
        translationDict,
        dimensions, 
        metricsFormatDict,
        dimensionColumnFormatterGen,
        isCustomHeader,
        settings,
        rest
      })
  
      let newSettings = settings
      if (type === 'flat-table') newSettings = _.omit(settings, ['customColumns']) //排除自定义列头的数据
      return (
        <TableComponent
          //  ref={ref => this._table = ref} 这行谁干掉了 多维分析下载数据用的
          ref={ref => this._table = ref}
          dimensions={dimensions}
          metrics={metrics}
          scroll={{x: '100%'}}
          dataSource={newData}
          indentSize={5}
          size='small'
          bordered
          style={style}
          columns={tableColumns}
          defaultExpandAllRows
          isCustomHeader={isCustomHeader}
          {...rest}
          settings={newSettings}
        />
      )
    }
  }
}
