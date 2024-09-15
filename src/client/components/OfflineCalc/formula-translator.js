import _ from 'lodash'
import {statisticsTypeTextMap} from '../../common/constans'
import DruidColumnType from '../../../common/druid-column-type'

let formatOp = (op) => {
  switch (op) {
    case '*':
      return '×'
    case '/':
      return '÷'
    default: return op
  }
}


export default function translateFormula(ast, opt = {}) {
  let { dimIdNameDict, indicesIdDict, offlineCalcDataSources } = opt
  
  let dsIdDict = _.keyBy(offlineCalcDataSources, 'id')
  
  let createIdx = (args) => {
    const { dsId, dim, aggregator, filters } = args
    let {args: [{dimId, fieldName, tableName, dataType, dsId: dsId0}]} = dim
    
    const ds = _.get(dsIdDict, dsId)
    const ds0 = _.get(dsIdDict, dsId0)
    let dsName = _.get(ds,'name', '')
    dsName = dsName ? dsName + '|' : ''
    
    //限定条件的翻译　会导致字符串变复杂　暂时忽略　导入时　若修改了计算公式　去掉限定条件　没改就不管
    // let filterStr = ''
    // if (!_.isEmpty(filters)) {
    //   filterStr = ' 的筛选条件 '
    //   filters.map(fil => {
    
    //     let pre = callDict[fil.dim.func](fil.dim.args[0])
    //     let op = TextDimFilterOpNameMap[fil.op]
    //     let end = _.isString(fil.eq) ? fil.eq : fil.eq.reduce((a,b) => a+ '@' +b)
    
    //     // let ocDim = mockDim(_.get(fil.dim, 'args[0]'))
    //     // if (isTimeDimension(ocDim)) {
    //     //   let relativeTime = isRelative(filter.eq) ? filter.eq : 'custom'
    //     //   let [since, until] = relativeTime === 'custom' ? filter.eq : convertDateType(relativeTime)
    
    //     // }
    //     filterStr += `${pre}@${op}@${end},`
    //   })
    // }
    
    // let fieldTitle = dimId && (dimId in dimIdNameDict) ? dimIdNameDict[dimId] : `${_.get(ds0,'name')}/${tableName}/${fieldName}${filterStr.substr(0, filterStr.length - 1)}`
    
    let fieldTitle = dimId && (dimId in dimIdNameDict) ? dimIdNameDict[dimId] : `${_.get(ds0,'name')}/${tableName}/${fieldName}`
    
    return fieldTitle ? `${dsName}${fieldTitle} 的 ${statisticsTypeTextMap[aggregator]}` : '维度已删除'
  }
  
  let useIdx = ({dsId, idxId, filters}) => {
    const idxObj = _.get(indicesIdDict, idxId, {})
    
    const ds = _.get(dsIdDict, dsId)
    let dsName = _.get(ds,'name', '')
    dsName = dsName ? dsName + '|' : ''
    let name = idxObj.name
    
    return !_.isEmpty(idxObj) ? `${dsName}${name}` : '指标已删除'
  }
  
  let importDim = ({dsId, tableName, fieldName}) => {
    const ds = _.get(dsIdDict, dsId)
    let dsName = _.get(ds,'name', '')
    return `${dsName}/${tableName}/${fieldName}`
  }
  
  let useDim = ({dimId}, idx) => {
    return _.get(dimIdNameDict, dimId) || _.get(indicesIdDict, dimId) || dimId
  }

  //翻译filters用　暂时不处理filters
  /*let mockDim = (dimArgs) => {
    let {dimId, fieldName, dataType} = dimArgs || {}
    if (dimId) {
      return _.find(offlineCalcDimensions, d => d.id === dimId) || {type: DruidColumnType.String}
    }
    return {name: fieldName, type: _.isNumber(dataType) ? dataType : DruidColumnType.String}
  }*/
  
  let callDict = {
    createIdx: createIdx,
    useIdx: useIdx,
    useDim: useDim,
    importDim: importDim
  }
  
  let DLR = (tree) => {
    if (_.isNumber(tree)) return tree
    if (!tree) return ''
    let {left, right, op} = tree
    op = formatOp(op)
    
    if (!_.isArray(left) && _.isObject(left)){
      left = DLR(left)
    } else if (op === 'call') {
      op = ''
      left = `[${callDict[left](right[0])}]`
    }
    
    if (!_.isArray(right) && _.isObject(right)){
      right = DLR(right)
    } else if (_.isArray(right)) {
      right = ''
    }
    
    if (op) {
      return left + op + right
    } else {
      return left
      // if (_.isString(left)) {
      //   return callLeftRes
      // }
    }
  }
  
  return DLR(ast) + ''
}

export function findAllTableName(ast, opt = {}, tablesArr = [], set = new Set()) {
  let { dimIdNameDict, indicesIdDict, offlineCalcDataSources, offlineCalcTables, parse } = opt
  
  let dsIdDict = _.keyBy(offlineCalcDataSources, 'id')
  
  let createIdx = (args) => {
    const { dsId, dim, aggregator, filters } = args
    let {args: [{dimId, fieldName, tableName, dataType, dsId: dsId0}]} = dim
    
    const ds = _.get(dsIdDict, dsId)
    const ds0 = _.get(dsIdDict, dsId0)
    let dsName = _.get(ds,'id', '')
    dsName = dsName ? dsName + '|' : ''
    
    let tableId = ''
    tableId = _.get(_.find(offlineCalcTables, o => o.data_source_id === _.get(ds0,'id') && o.name === tableName), 'id', '')
    let fieldTitle = `${_.get(ds0,'id')}/${tableId}`
    
    if (fieldTitle) {
      tablesArr.push(`${dsName}${fieldTitle}`)
    }
    return fieldTitle ? `${dsName}${fieldTitle}` : '维度已删除'
  }
  
  let useIdx = ({dsId, idxId, filters}) => {
    if (set.has(idxId)) return
    set.add(idxId)
    const idxObj = _.get(indicesIdDict, idxId, {})
    
    const ds = _.get(dsIdDict, dsId)
    let dsName = _.get(ds,'name', '')
    dsName = dsName ? dsName + '|' : ''
    let name = idxObj.name
    
    let idxsDims = _.get(idxObj, 'formula_info.dimDeps', [])
    let idxsIdx = _.get(idxObj, 'formula_info.idxDeps', [])

    idxsDims.map( i => {
      i = i.split('|')
      i.pop()
      const [dsId, tableName] = i
      let tableId = ''
      tableId = _.get(_.find(offlineCalcTables, o => o.data_source_id === dsId && o.name === tableName), 'id', '')
      i[1] = tableId
      tablesArr.push(i.join('/'))
    })
    idxsIdx.map( i => {
      i = _.get(indicesIdDict, i, {})
      let ast = i.formula_info.text
      try {
        ast = parse(ast)
      } catch (e) {
        ast = ''
      }
      findAllTableName(ast, opt, tablesArr, set)
    })
    return !_.isEmpty(idxObj) ? `${dsName}${name}` : '指标已删除'
  }
  
  let importDim = ({dsId, tableName, fieldName}) => {
    const ds = _.get(dsIdDict, dsId)
    let dsName = _.get(ds,'id', '')

    let tableId = ''
    tableId = _.get(_.find(offlineCalcTables, o => o.data_source_id === dsName && o.name === tableName), 'id', '')

    if (tableName) {
      tablesArr.push(`${dsName}/${tableId}`)
    }
    return `${dsName}/${tableName}/${fieldName}`
  }
  
  let useDim = ({dimId}, idx) => {
    return _.get(dimIdNameDict, dimId) || _.get(indicesIdDict, dimId) || dimId
  }

  let callDict = {
    createIdx: createIdx,
    useIdx: useIdx,
    useDim: useDim,
    importDim: importDim
  }
  
  let DLR = (tree) => {
    if (_.isNumber(tree)) return tree
    if (!tree) return ''
    let {left, right, op} = tree
    op = op === 'call' ? 'call' : ','
    
    if (!_.isArray(left) && _.isObject(left)){
      left = DLR(left)
    } else if (op === 'call') {
      op = ''
      left = `${callDict[left](right[0])}`
    }
    
    if (!_.isArray(right) && _.isObject(right)){
      right = DLR(right)
    } else if (_.isArray(right)) {
      right = ''
    }
    
    if (op) {
      return left + op + right
    } else {
      return left
      // if (_.isString(left)) {
      //   return callLeftRes
      // }
    }
  }
 
  let res = DLR(ast) + ''
  tablesArr = Array.from(new Set(tablesArr))
  return tablesArr
}
