import moment from 'moment'
import _ from 'lodash'
import FetchFinal from 'client/common/fetch-final'
import {AccessDataType, VisualModelCalcTypeEnum} from 'common/constants'
import DruidColumnType, {DruidColumnTypeInverted} from 'common/druid-column-type'
import {forAwaitAll, isDiffBySomePath} from 'common/sugo-utils'
import {numberFormulaGenerator, stringFormulaGenerator} from 'common/temp-metric'

const {
  offlineCalcIndicesDefaultPrefix = 'SI-'
} = window.sugo

export function genIndicesId(offset = 0) {
  const dayCount = moment().diff(0, 'day')
  const minuteCountInToday = moment().diff(moment().startOf('day'), 'minute')
  const minuteCountCompress = Math.floor(minuteCountInToday * (999/1440))
  // 自动生成指标 id 规则：SI-从1970年到今天的天数-今天分钟数压缩至0~999
  return `${offlineCalcIndicesDefaultPrefix}${dayCount}${minuteCountCompress + offset}`
}

export function createProjectForModel(getDruidDimTypeByTableField, opts = {}) {
  const { depTables, outputCols, idxIdDict, projectList, targetProjectName, calcType = VisualModelCalcTypeEnum.Select, institution} = opts
  const isCalcTypeEqGroupBy = calcType === VisualModelCalcTypeEnum.GroupBy
  const roleIds = _.map(window.sugo.user.SugoRoles, r => r.id)
  
  const formulaAstToPlyqlFormula = (ast) => {
    if (!_.isPlainObject(ast)) {
      return ast
    }
    let {op, left, right} = ast
    switch (op) {
      case '+':
      case '-':
        return `(${formulaAstToPlyqlFormula(left)} ${op} ${formulaAstToPlyqlFormula(right)})`
      case '*':
        return `${formulaAstToPlyqlFormula(left)} ${op} ${formulaAstToPlyqlFormula(right)}`
      case '/':
        return `(${formulaAstToPlyqlFormula(left)} ${op} ${formulaAstToPlyqlFormula(right)})`
      case 'call':
        if (left === 'createIdx') {
          let {dim, filters, aggregator} = right[0]
          let {dataType, fieldName} = _.get(dim, 'args[0]')
          // TODO consider rename
          let sliceFilters = filters.map(flt => {
            return {
              ...flt,
              col: _.get(flt, 'dim.args[0].fieldName')
            }
          })
          const generator = DruidColumnTypeInverted[dataType] === 'number'
            ? numberFormulaGenerator({filters: sliceFilters})
            : stringFormulaGenerator({filters: sliceFilters})
          return generator[aggregator](fieldName)
        }
        if (left === 'useIdx') {
          let {idxId} = right[0]
          let ast = _.get(idxIdDict[idxId], 'formula_info.ast')
          return ast && formulaAstToPlyqlFormula(ast) || ''
        }
        throw new Error(`Unhandled func: ${left}`)
      default:
        throw new Error(`Unhandled op: ${left}`)
    }
  }
  
  function outputDimColInfoToDbDim(oc, institution) {
    let {dimId, renameTo, omitInGroupByMode, castTo, parseDateFormat, castToDateFormat, isMainTimeDim} = oc
    if (isCalcTypeEqGroupBy && omitInGroupByMode) {
      return null
    }
    let [tableId, fieldName] = dimId.split('/')
    let originalDimType = getDruidDimTypeByTableField(tableId, fieldName)
    let params = {originalType: originalDimType, parseDateFormat, castToDateFormat, isMainTimeDim, isInstitution: false}
    if (dimId === institution) params.isInstitution = true
    return {
      name: _.startsWith(tableId, 'hive')
        ? renameTo || fieldName
        : _.snakeCase(renameTo || fieldName),
      type: castTo ? DruidColumnType[castTo] : originalDimType,
      // 'user_ids':[],
      role_ids: roleIds,
      // 'tags':[],
      // 'sourceName': existedProject.datasource_name,
      // 'isUindex': false,
      params,
      _dimDeps: [{tableId, fieldName}]
    }
  }
  
  function guessIdxOutputType(idxAst) {
    // count, countDistinct => long
    // max, min, sum => by dim type
  
    // useIdx({idxId: 'dimId'}) 使用现有指标
    // createIdx({dim: {func: 'useDim', args: [{dimId: 'xxx'}]}, aggregator: 'count'}) 创建指标
  
    if (!_.isPlainObject(idxAst)) {
      return _.isInteger(+idxAst) ? DruidColumnType.Int : DruidColumnType.Double
    }
    let {op, left, right} = idxAst
    switch (op) {
      case '+':
      case '-':
      case '*':
      case '/':
      {
        return guessIdxOutputType(left) === DruidColumnType.Double || guessIdxOutputType(right) === DruidColumnType.Double
          ? DruidColumnType.Double
          : DruidColumnType.Int
      }
      case 'call':
        if (left === 'createIdx') {
          let {dim, filters, aggregator} = right[0]
          if (aggregator === 'count' || aggregator === 'countDistinct') {
            return DruidColumnType.Int
          }
          // TODO find real dim type
          // let {dataType, fieldName} = _.get(dim, 'args[0]')
          return DruidColumnType.Double
        }
        if (left === 'useIdx') {
          let {idxId} = right[0]
          let ast = _.get(idxIdDict[idxId], 'formula_info.ast')
          return ast && guessIdxOutputType(ast) || DruidColumnType.Double
        }
        throw new Error(`Unhandled func: ${left}`)
      default:
        throw new Error(`Unhandled op: ${left}`)
    }
  }
  
  function outputIdxColInfoToDbDim(oc) {
    let {idxId, renameTo} = oc
    let idx = _.get(idxIdDict, idxId)
    let isCalcDim = _.get(idx, 'formula_info.isCalcDim')
    let dimDepInfos = _(_.get(idx, 'formula_info.dimDeps') || [])
      .map(dimDep => {
        // dsId|tableName|fieldName
        let [dsId, tableName, fieldName] = dimDep.split('|')
        let table = _.find(depTables, t => t.name === tableName && t.data_source_id === dsId)
        return table && {tableId: table.id, fieldName}
      })
      .compact()
      .value()
    
    if (!isCalcDim) {
      // 聚合型指标，输出大宽表时不输出，同步到指标管理，在多维分析实时计算
      if (!isCalcTypeEqGroupBy) {
        return null
      }
      // groupby 模式，聚合型指标将会输出成数值列
      let idxAst = _.get(idx, 'formula_info.ast')
      return {
        name: _.snakeCase(renameTo || idx.name),
        type: guessIdxOutputType(idxAst),
        role_ids: roleIds,
        _dimDeps: dimDepInfos
      }
    }
  
    // 非聚合型指标, 目前非聚合指标只支持数值
    let druidTypes = _.map(dimDepInfos, dimDepInfo => {
      return getDruidDimTypeByTableField(dimDepInfo.tableId, dimDepInfo.fieldName)
    }).filter(_.identity)
    
    return {
      name: _.snakeCase(renameTo || idx.name),
      type: _.some(druidTypes, t => t === DruidColumnType.Float || t === DruidColumnType.Double || t === DruidColumnType.BigDecimal)
        ? DruidColumnType.Double
        : _.some(druidTypes, t => t === DruidColumnType.Long)
          ? DruidColumnType.Long
          : DruidColumnType.Int,
      role_ids: roleIds,
      _dimDeps: dimDepInfos
    }
  }
  
  const createProject = async () => {
    // TODO 支持非名称对应，支持修改
    let existedProject = _.find(projectList, p => p.name === targetProjectName)
    if (!existedProject) {
      let createProjRes = await FetchFinal.post('/app/project/create', {
        name: targetProjectName,
        type: AccessDataType.OfflineCalc
      })
      existedProject = createProjRes && createProjRes.result
    }
    if (!existedProject) {
      throw new Error(`创建项目失败：${targetProjectName}`)
    }
    // 创建维度
    let preCreateDims = _(outputCols)
      .map(oc => {
        let {dimId, idxId, renameTo} = oc
        if (dimId) {
          return outputDimColInfoToDbDim(oc, institution)
        } else if (idxId) {
          return outputIdxColInfoToDbDim(oc)
        } else {
          throw new Error(`Unknown outputCol: ${JSON.stringify(oc)}`)
        }
      })
      .compact()
      .value()
    
    let existedDims = await FetchFinal.get(`/app/dimension/get/${existedProject.datasource_id}`)
    let existedDimDict = _.keyBy(existedDims && existedDims.data, 'name')
    await forAwaitAll([{name: '__time', type: DruidColumnType.Date, role_ids: roleIds }, ...preCreateDims], async preCreateDim => {

      let existed = existedDimDict[preCreateDim.name]
      if (existed) {
        if (!isDiffBySomePath(preCreateDim, existed, 'type', 'role_ids') && !isDiffBySomePath(preCreateDim, existed, 'params.isInstitution')) {
          return
        }

        let res = await FetchFinal.put(`/app/dimension/update/${existed.id}`, preCreateDim)
        if (!res) {
          throw new Error(`更新项目维度失败： ${preCreateDim.name}`)
        }
      } else {
        let res = await FetchFinal.post(`/app/dimension/create/${existedProject.datasource_id}`, preCreateDim)
        if (!res) {
          throw new Error(`创建项目维度失败： ${preCreateDim.name}`)
        }
      }
    })
    
    // 创建指标
    let preCreateMetrics = isCalcTypeEqGroupBy ? [] : _(outputCols).filter(oc => oc.idxId)
      .map(oc => {
        let {idxId, renameTo} = oc
        let idx =  _.get(idxIdDict, idxId)
        let isCalcDim = _.get(idx, 'formula_info.isCalcDim')
        if (isCalcDim) {
          return null
        }
        const formulaAst = _.get(idx, 'formula_info.ast')
        return {
          name: renameTo || idx.name,
          title: idx.title || renameTo || idx.name,
          formula: formulaAstToPlyqlFormula(formulaAst).toString(),
          role_ids: roleIds,
          type:1,
          params:{'simple':{'filters':[],'statistics':{'type':'count','dimensionName':''}},'composite':{'items':[{},{}],'operator':'divide'},'formulaEditMode':'direct'}
        }
      })
      .compact()
      .value()
  
    let existedIdxs = await FetchFinal.get(`/app/measure/get/${existedProject.datasource_id}`)
    let existedIdxDict = _.keyBy(existedIdxs && existedIdxs.data, 'name')
    await forAwaitAll(preCreateMetrics, async m => {
      let existed = existedIdxDict[m.name]
      if (existed) {
        if (!isDiffBySomePath(m, existed, 'formula', 'role_ids')) {
          return
        }
        let res = await FetchFinal.put(`/app/measure/update/${existed.id}`, m)
        if (!res) {
          throw new Error(`更新项目指标失败： ${m.title || m.name}`)
        }
      } else {
        let res = await FetchFinal.post(`/app/measure/create/${existedProject.datasource_id}`, m)
        if (!res) {
          throw new Error(`创建项目指标失败： ${m.title || m.name}`)
        }
      }
    })
  
    return {
      targetProject: existedProject,
      outputDims: preCreateDims
    }
  }
  return createProject()
}
