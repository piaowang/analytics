import React from 'react'
import Bread from '../Common/bread'
import {message} from 'antd'
import _ from 'lodash'
import {connect} from 'react-redux'
import { OfflineCalcTargetType, OfflineCalcChartType } from '../../../common/constants'
import {statisticsTypeTextMap} from '../../common/constans'
import Fetch from '../../common/fetch-final'
import { TextDimFilterOpNameMap } from './filters-editor-for-offline-calc'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {dictBy} from '../../../common/sugo-utils'
import {tableListSagaModelGenerator} from './saga-model-generators'
import shortid from 'shortid'

import ReactEcharts from '../Charts/ReactEchartsEnhance'

const fetchedId = new Set()

@connect(state => ({ 
  ...state['sagaCommon'], 
  ...state['offlineCalcRelationTrace'],
  ...state['offline-calc-tables-list-for-relation-trace'],
  users: _.get(state, 'common.users', []) 
}))
@withRuntimeSagaModel([
  tableListSagaModelGenerator('offline-calc-tables-list-for-relation-trace')
])
export default class OfflineCalcRelationTrace extends React.Component {

  state = {
    echartInst: null
  }

  componentDidMount() {
    // this.props.dispatch(getUsers())
  }

  componentWillUnmount() {
    fetchedId.clear()
  }

  saveEchartInstance(e) {
    if (e) {
      this.setState({ echartInst: e })
    }
  }

  dispatch(func, payload) {
    this.props.dispatch({
      type: `offlineCalcRelationTrace/${func}`,
      payload
    })
  }

  changeProps(payload) {
    this.props.dispatch({
      type: 'offlineCalcRelationTrace/change',
      payload
    })
  }

  findLocate(data, targetKey) {
    if (!_.isArray(data)) {
      return data
    }
    if (_.isArray(data)) {
      for (let i = 0; i < data.length; i ++) {
        let target = _.get(data, `[${i}]`)
        if (_.get(target, 'key0') === targetKey) {
          return target
        }
        let children = _.get(target, 'children')
        if (children) {
          target = this.findLocate(children, targetKey)
          if (target) return target
        }
      }
    }
  }

  async eventHandler(params, chartType) {
    const { echartInst: e } = this.state
    if (!e) return
    if (params.data.isRoot) return

    let option0 = e.getOption()
    let data = _.cloneDeep(option0.series[0].data)
    let id = _.get(params, 'data.id0')
    let targetKey = _.get(params, 'data.key0')
    let targetType = _.get(params, 'data.targetType')

    let apiSet = {
      [OfflineCalcChartType.relation]: {
        method: 'get',
        api: '/app/offline-calc/get-relationship'
      },
      [OfflineCalcChartType.influence]: {
        method: 'get',
        api: '/app/offline-calc/get-influencesList'
      }
    }

    let method = apiSet[chartType].method
    let api = apiSet[chartType].api

    if (chartType === OfflineCalcChartType.relation) {
      if (id && id !== 'dataSourceDim') {
        // if (fetchedId.has(id)) return message.success('已有节点加载过该节点')
        fetchedId.add(id)

        if (chartType === OfflineCalcChartType.relation) {
          const { result } = await Fetch[method](api, { id, targetType })
          if (!_.isEmpty(_.get(result,'formulaTree'))) {
            const { formulaTree } = result
            let res = this.DLR(formulaTree)

            let targetChild = this.findLocate(data[0].children, targetKey)

            if (!_.isEmpty(res)) {
              targetChild.children = _.isArray(res) ? res : [res]
              data = this.genTreeKey(data)
              let option = this.genTree(data)
              e.setOption(option)
              return
            } 
          } 
          fetchedId.delete(id)
          return message.success('已达终点')
        }
      }

      let opArr = [ '+', '-', '×', '÷']
      if (!opArr.includes(params.name) && !params.isSymbol) {
        fetchedId.delete(id)
        return message.success('已达终点')
      }
    }

    if (chartType === OfflineCalcChartType.influence) {
      // if (fetchedId.has(id) && _.isEmpty(_.get(params, 'data.children'))) {
      //   return message.success('已有节点加载过该节点')
      // } else if (fetchedId.has(id) && !_.isEmpty(_.get(params, 'data.children'))) {
      //   return
      // }
      if (fetchedId.has(id) && !_.isEmpty(_.get(params, 'data.children'))) {
        return
      }
      fetchedId.add(id)
      let { result: influenceArr } = await Fetch[method](api, { id, targetType })
      if (_.isEmpty(influenceArr)) {
        fetchedId.delete(id)
        return message.success('已达终点')
      }
      let targetChild = this.findLocate(data[0].children, targetKey)
      targetChild.children = influenceArr.map( i => {
        return {
          name: i.title || i.name,
          id0: i.id,
          detailStr: this.genDetailStr(i),
          targetType: i.targetType
        }
      })
      data = this.genTreeKey(data)
      let option = this.genTree(data)
      e.setOption(option)
    }
  }

  formatOp(op) {
    switch (op) {
      case '*':
        return '×'
      case '/':
        return '÷'
      default: return op
    }
  }

  //前序遍历
  DLR(tree){
    if (!tree) return []
    let left = tree.left
    let right = tree.right
    let op = tree.op
    let callLeftRes = {}
    let callRightRes = {}
    op = this.formatOp(op)

    if(!_.isArray(left) && _.isObject(left)){
      callLeftRes = this.DLR(left)
      left = callLeftRes
      if (callLeftRes.isResult) left = callLeftRes.name
    } else if (op === 'call') {
      op = ''
      callLeftRes = this[left](right[0])
      left = callLeftRes
      if (callLeftRes.isResult) left = callLeftRes.name
    } else if (_.isNumber(left)) {
      callLeftRes = {
        name: left + '',
        isResult: true
      }
      left = left + ''
    }

    if(!_.isArray(right) && _.isObject(right)){
      callRightRes = this.DLR(right)
      right = callRightRes
      if (callRightRes.isResult) right = callRightRes.name
    } else if (_.isArray(right)) {
      right = ''
    } else if (_.isNumber(right)) {
      callRightRes = {
        name: right + '',
        isResult: true
      }
      right = 'handleNumber'
    }

    if (op) {
      if (_.isString(left) && _.isString(right)) {
        return [{
          name: op,
          children: [{ ...callLeftRes }, { ...callRightRes }]
        }]
      } else if (_.isArray(left)) {
        //到这个地方left如果是数组 只会是递归返回的结果 不是原数组
        if (_.isString(right)) {
          return [{
            name: op,
            isSymbol: true,
            children: [
              { ...callRightRes },
              { ...left[0] }
            ]
          }]
        }
        return [{
          name: op,
          isSymbol: true,
          children: left
        }]
      } else if (_.isArray(right)) {
        if (_.isString(left)) {
          return [{
            name: op,
            isSymbol: true,
            children: [{ ...callLeftRes }, ...right]
          }]
        }
        return [{
          name: op,
          isSymbol: true,
          children: right
        }]
      }
    } else {
      if (_.isString(left)) {
        return callLeftRes
      }
    }
  }

  createIdx(args) {
    const { dsId, dim, aggregator, filters } = args
    let { dimIdNameDict, dsIdDict, offlineCalcTables } = this.props
    let {args: [{dimId, fieldName, tableName, dataType, dsId: dsId0}]} = dim

    let tableNameDict = dictBy(offlineCalcTables, o => o.name)

    //详细信息
    let detailStr = ''


    let fieldTitle = dimId && (dimId in dimIdNameDict) ? dimIdNameDict[dimId] : fieldName
    
    const ds = _.get(dsIdDict, dsId)
    const ds0 = _.get(dsIdDict, dsId0)
    detailStr += `所属数据源:${_.get(ds0, 'name')}<br/>所属表:${_.get(tableNameDict,`[${tableName}].title`, tableName)}`
    let dsName = _.get(ds,'name', '')
    dsName = dsName ? dsName + '|' : ''

    // 翻译限定条件
    let filterStr = ''
    if (!_.isEmpty(filters)) {
      filterStr = ''
      filters.map(fil => {
        const { dim: { args: [{ dsId: filDsId, fieldName: filFieldName, tableName: filTableName}] } } = fil
        const filDs0 = _.get(dsIdDict, filDsId)
        let pre = this[fil.dim.func](fil.dim.args[0])
        let op = TextDimFilterOpNameMap[fil.op]
        let end = _.isString(fil.eq) ? fil.eq : fil.eq.reduce((a,b) => a+ ',' +b)
        filterStr += `${_.get(filDs0, 'name')}/${_.get(tableNameDict,`[${filTableName}].title`,filTableName)}/${pre.name}  ${op}  ${end}<br/>`
      })
    }
    return {
      name: fieldTitle ? `${dsName}${fieldTitle} 的 ${statisticsTypeTextMap[aggregator]}` : '（维度已删除）',
      detailStr,
      filterStr: filterStr.substr(0, filterStr.length - 5),
      id0: dimId && (dimId in dimIdNameDict) ? dimId : 'dataSourceDim',
      targetType: OfflineCalcTargetType.Dimension,
      isResult: true
    }
  }

  useIdx({dsId, idxId, filters}) {
    let { indicesIdDict, dsIdDict } = this.props
    const idxObj = _.get(indicesIdDict, idxId, {})

    let detailStr = ''

    const ds = _.get(dsIdDict, dsId)
    let dsName = _.get(ds,'name', '')
    dsName = dsName ? dsName + '|' : ''
    let name = idxObj.title || idxObj.name
    let version = _.get(idxObj, 'SugoVersionHistory.version', '私有版本')

    detailStr += `编号:${idxId}<br/>所属数据源:${_.get(ds, 'name', '跨数据源')}<br/>版本号:${version}`
    return {
      name: idxObj ? dsName + name : '（指标已删除)',
      id0: idxId,
      detailStr,
      targetType: OfflineCalcTargetType.Indices,
      isResult: true
    }
  }

  importDim({dsId, tableName, fieldName}) {
    return {
      name: fieldName,
      targetType: OfflineCalcTargetType.Dimension,
      isResult: true
    }
  }

  useDim({dimId}, idx) {
    const { dimIdNameDict } = this.props
    return _.get(dimIdNameDict, dimId) || dimId
  }

  mockDim = (dimArgs) => {
    let {dimId, fieldName, dataType} = dimArgs || {}
    return {name: fieldName, type: _.isNumber(dataType) ? dataType : DruidColumnType.String}
  }

  dimIdNameDict({dimId}) {
    return {
      name:  _.get(dimIdNameDict, dimId) || dimId,
      targetType: OfflineCalcTargetType.Dimension,
      isResult: true
    }
  }

  genDetailStr(item) {
    const { indicesIdDict, dsIdDict } = this.props 
    let detailStr = ''
    const dsId = item.data_source_id
    const idxId = item.id
    const targetType = item.targetType
    const idxObj = _.get(indicesIdDict, idxId, {})
    let version = _.get(idxObj, 'SugoVersionHistory.version', '私有版本')
    const ds = _.get(dsIdDict, dsId)

    if (item.hasOwnProperty('formula_info')) {
      detailStr = `编号:${idxId}<br/>所属数据源:${_.get(ds, 'name', '跨数据源')}<br/>版本号:${version}`
    }
    if (targetType === OfflineCalcTargetType.Table) {
      detailStr = `所属数据源:${_.get(ds, 'name', '跨数据源')}`
    }
    return detailStr
  }

  genRelationTreeData() {
    const { formulaTree, rootPoint, indicesIdDict, dsIdDict } = this.props
    if (_.isEmpty(rootPoint) || _.isEmpty(formulaTree)) {
      if (_.isNumber(formulaTree)) return [{
        name: rootPoint.title || rootPoint.name,
        isRoot: true,
        detailStr:  this.genDetailStr(rootPoint)
      }]
      return
    }

    let res 
    //只有一层时 返回对象
    if (_.isObject(formulaTree)) {
      res = this.DLR(formulaTree)
    } else {
      res = { name: formulaTree + '', detailStr:  this.genDetailStr(rootPoint) }
    }

    let data = [{
      name: rootPoint.title || rootPoint.name,
      isRoot: true,
      detailStr:  this.genDetailStr(rootPoint),
      children: _.isArray(res) ? res : [res]
    }]

    return data
  }

  genInfluenceData(str = '') {
    const { influenceTree, rootPoint, indicesIdDict, dsIdDict, location } = this.props 
    if (_.isEmpty(rootPoint) && _.isEmpty(influenceTree)) return

    const { targetType } = _.get(location, 'query')

    rootPoint.targetType = targetType
    let rootDetail = this.genDetailStr(rootPoint)
    let children = influenceTree.map( (i,idx) => {
      let detailStr = this.genDetailStr(i)
      return {
        name: i.title || i.name,
        detailStr,
        id0: i.id,
        targetType: i.targetType
      }
    })
    let data = [{
      name: rootPoint.title || rootPoint.name,
      isRoot: true,
      detailStr: rootDetail,
      children
    }]

    return data
  }

  genTree(data) {
    let option = {

      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove',
        formatter: (params) => {
          let res = params.data.detailStr
          if (params.data.filterStr) {
            res += '<br/>' + '限定条件:' + '<br/>' + params.data.filterStr
          }
          return res
        }
      },
      label: {
        position: 'top',
        verticalAlign: 'middle',
        align: 'top'
      },


      series: [
        {
          type: 'tree',
          data,
          initialTreeDepth: -1,
          top: '1%',
          left: '15%',
          bottom: '1%',
          right: '10%',

          symbol: 'emptyCircle',
          symbolSize: 10,
          expandAndCollapse: true,
          label: {
            normal: {
              fontSize: 12
            }
          },

          orient: 'RL',

          leaves: {
            label: {
              position: 'left',
              verticalAlign: 'middle',
              align: 'right'
            }
          }

          // expandAndCollapse: true,
          // animationDuration: 550,
          // animationDurationUpdate: 750
        }
      ]
    }

    return option
  }

  genTreeKey(arr, prekey) {
    arr = arr.map( (i,idx) => {
      if (_.isEmpty(i.children)) return {
        ...i,
        key0:  prekey ? prekey + '-' + idx : idx + ''
      }
      i.children = this.genTreeKey(i.children, prekey ? prekey + '-' + idx : idx + '')
      return {
        ...i,
        key0:  prekey ? prekey + '-' + idx : idx + ''
      }
    })
    return arr
  }

  renderInfluenceChart(){
    let data = this.genInfluenceData('init')
    if (_.isEmpty(data)) return
    data = this.genTreeKey(data)
    let option = this.genTree(data)
    
    return (
      <div>
        <div className="mg3t aligncenter">点击末端可查看影响</div>
        { this.renderChart(option, OfflineCalcChartType.influence)}
      </div>
    )

  }

  renderRelationChart() {
    let data = this.genRelationTreeData()
    if (_.isEmpty(data)) return
    data = this.genTreeKey(data)
    let option = this.genTree(data)

    return (
      <div>
        <div className="mg3t aligncenter">点击末端可追溯血缘</div>
        { this.renderChart(option, OfflineCalcChartType.relation)}
      </div>
    )
  }

  renderChart(option, chartType) {
    return (
      <div className="height800" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
      >
        <ReactEcharts
          ref="echarts"
          className="width-100 height-100 mg3b"
          option={option}
          onChartReady={e => {
            this.saveEchartInstance(e)
          }}
          onEvents={{
            'click': (params) => this.eventHandler(params, chartType)
          }}
        />
      </div>
    )
  }
  
  render() {
    let { params, location } = this.props
    const { id: targetId } = params
    const { targetType, chartType } = _.get(location, 'query')
    let search = window.location.search

    let breadArr = {
      [OfflineCalcTargetType.Indices]: { name: '指标库', link: '/console/offline-calc/indices' },
      [OfflineCalcTargetType.Table]: { name: '维表管理', link: '/console/offline-calc/tables' },
      [OfflineCalcTargetType.Datasource]: { name: '数据源管理', link: '/console/offline-calc/data-sources' }
    }

    let breadChart = {
      [OfflineCalcChartType.relation]: { name: '血缘追溯' },
      [OfflineCalcChartType.influence]:  { name: '影响分析' }
    }

    let chartRender = {
      [OfflineCalcChartType.relation]: this.renderRelationChart(),
      [OfflineCalcChartType.influence]: this.renderInfluenceChart()
    }

    return (
      <div>
        <Bread
          path={[
            breadArr[targetType],
            breadChart[chartType]
          ]}
        />
        {chartRender[chartType]}
      </div>  
    )
  }
}
