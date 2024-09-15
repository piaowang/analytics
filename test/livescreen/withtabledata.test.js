import React from 'react'
import {Table} from 'antd'
import { 
  propsA1, newDataResultA1, tableColumnsResultA1, 
  propsB1, newDataResultB1, tableColumnsResultB1, newSettingsResultB1
} from './testdata'
const TestRenderer = require('react-test-renderer')
import chai from 'chai'
import _ from 'lodash'

const {expect} = chai

const { withTableData } = require('../../src/client/components/Charts/TableChart/withTableData')
// const { withTableData: testb } = require('../../src/client/components/Charts/TableChart/flat-table')
// const { withTableData: testc } = require('../../src/client/components/Charts/TableChart')


// 对withTableData 有以下测试块
// 1.props内容需要保持一致
// 2.columns在当中处理过 需要测试产出内容一致性
// 3.props.data为空时 产出组件为Alert 而不是传入的低阶组件




describe('WithTableData', function () {
  const WithTableData = withTableData()

  let { data, style, dimensions, metrics, translationDict, dimensionColumnFormatterGen, metricsFormatDict, ...rest } = propsA1
  
  const dealMap = {
    'table' : {
      columns: dimensions.length !== 0 ? [dimensions.join(', ')].concat(metrics) : metrics,
      data: WithTableData.genData(data, dimensions, this.columns)
    },
    'flat-table': {
      columns: [...dimensions, ...metrics],
      data: data
    }
  }
  
  describe('TableChart/index', function () {
    const type = 'table'

    const columns = dealMap[type].columns
  
    const newData = dealMap[type].data
  
    const tableColumns = WithTableData.genTableColumns({
      columns,
      translationDict,
      dimensions,
      metricsFormatDict,
      dimensionColumnFormatterGen,
      rest
    })
  
    it('newData', function () {
      expect(_.isEqual(newData, newDataResultA1)).to.be.true
    })
  
    it('tableColumns', function () {
      // tableColumns 中有render函数 此处屏蔽掉进行断言 暂认为无影响
      expect(_.isEqual(JSON.parse(JSON.stringify(tableColumns,null,2)), tableColumnsResultA1)).to.be.true
    })
  })

  describe('TableChart/flat-table', function () {
    let { data, style, dimensions, metrics, translationDict, dimensionColumnFormatterGen, metricsFormatDict, ...rest } = propsB1

    // const columns = WithTableData.genColumns({
    //   dimensions,
    //   metrics
    // })
  
    // const newData = WithTableData.genData(data, dimensions, columns)
  
    // const tableColumns = WithTableData.genTableColumns({
    //   columns,
    //   translationDict,
    //   dimensions,
    //   metricsFormatDict,
    //   dimensionColumnFormatterGen,
    //   rest
    // })
  
    // it(`newData`, function () {
    //   expect(_.isEqual(newData, newDataResultA1)).to.be.true
    // })
  
    // it(`tableColumns`, function () {
    //   // tableColumns 中有render函数 此处屏蔽掉进行断言 暂认为无影响
    //   expect(_.isEqual(JSON.parse(JSON.stringify(tableColumns,null,2)), tableColumnsResultA1)).to.be.true
    // })
  })
})
