import _ from 'lodash'
import DruidColumnType, {DruidColumnTypeInverted, DruidNativeType, DruidType} from './druid-column-type'
import {VisualModelCalcTypeEnum} from './constants'

// https://cwiki.apache.org/confluence/display/Hive/LanguageManual+Types#LanguageManualTypes-CastingDates
export const timestampFormatForHive = 'yyyy-MM-dd HH:mm:ss.SSS'
export const timestampFormatForHiveWithoutMS = 'yyyy-MM-dd HH:mm:ss'

export const FilterOpValueMap = {
  contains: 'like',
  equal: '=',
  nullOrEmpty: 'is null',
  greaterThan: '>',
  lessThan: '<',
  greaterThanOrEqual: '>=',
  lessThanOrEqual: '<='
}
export default function offlineCalcModelToSql(model, opts = {}) {
  const {
    outputCols,
    diagramInfo,
    calcType = VisualModelCalcTypeEnum.Select,
    filters = [],
    offlineModelFilter = {}
  } = model.params
  const {
    rawTableNameDict,
    tableIdDict = {},
    idxIdDict = {},
    fieldNameModer = _.identity
  } = opts || {}
  const isCalcTypeEqGroupBy = calcType === VisualModelCalcTypeEnum.GroupBy
  
  const dimInfoToSQL = ({dsId, tableName, fieldName, castTo, parseDateFormat, castToDateFormat}) => {
    let table = _.find(tableIdDict, t => t.data_source_id === dsId && t.name === tableName)
    let dbName = _.get(table, ['params', 'hiveDbName']) || ''
    let rawTableName = _.get(rawTableNameDict, tableName) || tableName
    // 避免不同数据库有同名的表，需要带上数据库前缀
    // 因为 select xx 不能带库名，所以需要在 from 子句里面重命名
    const tableNameWithDb = [dbName, rawTableName].filter(_.identity).join('.')
    const tableNameUniq = (dbName ? `${dbName}_${rawTableName}` : rawTableName).toLowerCase()
    const finalFieldName = fieldNameModer(fieldName, table)
    if (finalFieldName) {
      // select db_tablename.field
      const fieldNameWithTableName = [tableNameUniq, finalFieldName].join('.')
      if (castTo) {
        let field = _.find(_.get(table.params, 'fieldInfos') || [], f => f.field === fieldName)
        let srcDruidType = _.capitalize(guessDruidStrTypeByDbDataType(field && field.type))
        // https://blog.csdn.net/qq_24236769/article/details/79420457
        if (srcDruidType === 'String' && castTo === 'Date') {
          // 不用转，在 spec 那里标记为日期类型
          // str -> iso date str
          return `from_unixtime(unix_timestamp(${fieldNameWithTableName}, ${valToSQL(parseDateFormat)}), ${valToSQL(timestampFormatForHive)})`
        } else if (srcDruidType === 'Date' && castTo === 'String') {
          return `from_unixtime(unix_timestamp(${fieldNameWithTableName}, ${valToSQL(parseDateFormat)}), ${valToSQL(castToDateFormat)})`
        } else if (DruidColumnTypeInverted[DruidColumnType[srcDruidType]] === 'number' && castTo === 'Date') {
          return `from_unixtime(${fieldNameWithTableName}, ${valToSQL(timestampFormatForHive)})`
        } else if (srcDruidType === 'Date' && DruidColumnTypeInverted[DruidColumnType[castTo]] === 'number') {
          return `unix_timestamp(${fieldNameWithTableName}, ${valToSQL(parseDateFormat)})`
        }
        // 字符串 和 数值 互转
        return `cast(${fieldNameWithTableName} as ${castTo.toLowerCase()})`
      }
      return fieldNameWithTableName
    }
    // from db.tablename db_tablename
    return `${tableNameWithDb} ${tableNameUniq}` // 省略 as
  }
  
  function handleAggregationIdxAst(ast) {
    // useIdx({idxId: 'dimId'}) 使用现有指标
    // createIdx({dim: {func: 'useDim', args: [{dimId: 'xxx'}]}, aggregator: 'count'}) 创建指标
    if (!_.isPlainObject(ast)) {
      // 一般是数值
      return ast
    }
    let {op, left, right} = ast
    switch (op) {
      case '+':
      case '-':
        return `(${handleAggregationIdxAst(left)} ${op} ${handleAggregationIdxAst(right)})`
      case '*':
      case '/':
        return `${handleAggregationIdxAst(left)} ${op} ${handleAggregationIdxAst(right)}`
      case 'call':
        if (left === 'createIdx') {
          let {dim, filters, aggregator} = right[0]
          let {dsId, tableName, fieldName, dataType} = _.get(dim, 'args[0]')
          // handle idx filter
          let sliceFilters = filters.map(flt => {
            // col: dsId|tableName|fieldName
            return {...flt, col: [dsId, tableName, fieldName].join('|')}
          })
          // aggregator 参考 statisticsTypeList
          const colName = dimInfoToSQL({dsId, tableName, fieldName})
          switch (aggregator) {
            case 'count':
            {
              const colNameWithFilter = _.isEmpty(sliceFilters)
                ? colName
                : `case when ${sliceFilters.map(singleFilterToSQL)} then 1 else 0 end`
              return `${aggregator}(${colNameWithFilter})`
            }
            case 'countDistinct':
            {
              const colNameWithFilter = _.isEmpty(sliceFilters)
                ? colName
                : `case when ${sliceFilters.map(singleFilterToSQL)} then 1 else 0 end`
              return `count(distinct ${colNameWithFilter})`
            }
            case 'max':
            case 'min':
            case 'sum':
            {
              const colNameWithFilter = _.isEmpty(sliceFilters)
                ? colName
                : `case when ${sliceFilters.map(singleFilterToSQL)} then ${colName} end`
              return `${aggregator}(${colNameWithFilter})`
            }
            // TODO 处理 last，然后移除创建指标时的限制 src/client/components/OfflineCalc/create-index-in-formula-editor-modal.jsx 81 行
            //  https://blog.csdn.net/sunnyyoona/article/details/56484919
            // case 'last':
            default:
              throw new Error(`Unhandled aggregator: ${aggregator}`)
          }
        }
        if (left === 'useIdx') {
          let {idxId} = right[0]
          let ast = _.get(idxIdDict[idxId], 'formula_info.ast')
          return ast && handleAggregationIdxAst(ast) || ''
        }
        throw new Error(`Unhandled func: ${left}`)
      default:
        throw new Error(`Unhandled op: ${left}`)
    }
  }
  
  const idxInfoToSQL = ({idxId}) => {
    const { formula_info: { ast, isCalcDim } } = idxIdDict[idxId]
    if (!isCalcDim) {
      return ''
    }
    let res = handleCalcDimAst(ast)
    return res
  }
  
  var handleCalcDimAst = ast => {
    if (!_.isPlainObject(ast)) {
      return ast
    }
    let {left, op, right} = ast
    switch (op) {
      case '+':
      case '-':
        return `(${handleCalcDimAst(left)} ${op} ${handleCalcDimAst(right)})`
      case '*':
      case '/':
        return `${handleCalcDimAst(left)} ${op} ${handleCalcDimAst(right)}`
      case 'call':
        if (left === 'importDim') {
          return dimInfoToSQL(right[0])
        }
        if (left === 'useIdx') {
          return idxInfoToSQL(right[0])
        }
        throw new Error(`Unhandled func: ${left}`)
      default:
        throw new Error(`Unhandled op: ${left}`)
    }
  }
  
  const dealWithJoinLinks = (joinLinks, tablesCount) => {
    const TYPEMAP = {
      'leftJoin': 'left join',
      'innerJoin': 'inner join',
      'rightJoin': 'right join',
      'fullJoin': 'full join'
    }
    
    let joinInfoDict = _(joinLinks).map( i => {
      const { source, target, type } = i
      const [ sourceTableId, sourceDimName ] = source.split('/')
      const [ targetTableId, targetDimName ] = target.split('/')
      const sourceTable = tableIdDict[sourceTableId]
      const targetTable = tableIdDict[targetTableId]
      const srcField = dimInfoToSQL({dsId: sourceTable.data_source_id, tableName: sourceTable.name, fieldName: sourceDimName})
      const targetField = dimInfoToSQL({dsId: targetTable.data_source_id, tableName: targetTable.name, fieldName: targetDimName})
  
      const filterMapKey = `${sourceTableId}|${targetTableId}`
      return {
        key: filterMapKey,
        type: TYPEMAP[type],
        filter: `${srcField} = ${targetField}`
      }
    })
      .groupBy(joinInfo => joinInfo.key)
      .value()
    
    if (_.some(Object.keys(joinInfoDict), joinInfoKey => _.uniq(joinInfoDict[joinInfoKey].map(ji => ji.type)).length !== 1)) {
      throw Error('两张表间只能有一种类型链接方式')
    }
    
    //检测闭环和没链接表的逻辑
    if (_.size(joinInfoDict) !== tablesCount - 1) {
      throw Error('有未链接的表或形成了闭环')
    }
    
    let sqlJoinParts = Object.keys(joinInfoDict).map((k, pos) => {
      let joinInfos = joinInfoDict[k]
      const [head, tail] = k.split('|')
      const srcTable = tableIdDict[head]
      const targetTable = tableIdDict[tail]
      let headTableName = dimInfoToSQL({dsId: srcTable.data_source_id, tableName: srcTable.name, fieldName: ''})
      let tailTableName = dimInfoToSQL({dsId: targetTable.data_source_id, tableName: targetTable.name, fieldName: ''})
      
      const joinType = joinInfos[0].type
      const joinCond = joinInfos.map(ji => ji.filter).join(' and ')
      return pos === 0
        ? `${headTableName} ${joinType} ${tailTableName} on ${joinCond}`
        : `${joinType} ${tailTableName} on ${joinCond}`
    }).join(' ')
    
    return sqlJoinParts
  }
  
  function valToSQL(val) {
    return _.isNil(val)
      ? 'null'
      : _.isNumber(val)
        ? val
        : `'${val.replace(/'/g, '\\\'')}'`
  }
  
  function singleFilterToSQL(flt) {
    let {col, op, eq, type = 'string'} = flt
    // col: dsId|tableName|fieldName
    let [dsId, tableName, fieldName] = col ? col.split('|') : []
    const colName = col && dimInfoToSQL({dsId, tableName, fieldName})
    switch (op) {
      case 'in':
      case 'not in':
        // db_tablename.field in (val1, val2)
        if (type === 'string') {
          return `${colName} ${op} (${eq.map(valToSQL).join(', ')})`
        }
        return `${colName} ${op.replace('in', 'between')} ${valToSQL(eq[0])} and ${valToSQL(eq[1])}`
      case 'contains':
      case 'not contains':
        return `${colName} ${op.replace('contains', 'like')} ${valToSQL(`%${eq}%`)}`
      default:
        throw new Error(`Unhandled op: ${op}`)
    }
  }
  // 转换指标建模的生sql

  function offlineModelFilterToSql () {
    if (!_.get(offlineModelFilter,'filters.length')) {
      return ''
    }
    if (offlineModelFilter.filters.length === 1) {
      const relation = _.get(offlineModelFilter, 'filters.0.relation', 'and')
      const sql = _.get(offlineModelFilter, 'filters.0.filters', []).map(p => {
        const tableInfo = _.get(tableIdDict, [p.table]) 
        const colName = p.col && dimInfoToSQL({dsId: tableInfo.data_source_id, tableName: tableInfo.name, fieldName: p.col})
        if (p.col === '') {
          return ''
        }
        if (p.op === 'nullOrEmpty') {
          return `${colName} ${FilterOpValueMap[p.op]}`
        }
        return `${colName} ${FilterOpValueMap[p.op]} '${p.op === 'contains' ? '%' : ''}${p.eq}${p.op === 'contains' ? '%' : ''}'`
      }).filter(_.identity).join(` ${relation} `)
      return sql ? `${sql}` : ''
    }
    let sql = []
    const relation = _.get(offlineModelFilter, 'relation', 'and')
    _.forEach(offlineModelFilter.filters, p => {
      const subRelation = _.get(p, 'relation', 'and')
      const subSql = _.get(p, 'filters', []).map(p => {
        const tableInfo = _.get(tableIdDict, [p.table]) 
        const colName = p.col && dimInfoToSQL({dsId: tableInfo.data_source_id, tableName: tableInfo.name, fieldName: p.col})
        if (p.col === '') {
          return ''
        }
        if (p.op === 'nullOrEmpty') {
          return `${colName} ${FilterOpValueMap[p.op]}`
        }
        return `${colName} ${FilterOpValueMap[p.op]} '${p.op === 'contains' ? '%' : ''}${p.eq}${p.op === 'contains' ? '%' : ''}'`
      }).filter(_.identity).join(` ${subRelation} `)
      sql.push(`(${subSql})`)
    })
    return sql ? `${sql.join(` ${relation} `)}` : ''
  }

  const genSqlExpression = () => {
    //TODO 表名需要替换程ds.tb式别名，数据源需要为hive中的名，当前版本没有翻译指标
    const { tables, joinLinks } = diagramInfo
    if (_.isEmpty(_.filter(outputCols, col => col.dimId))) {
      throw new Error('至少需要输出一个维度')
    }
    // if (tables.length > 1 && _.isEmpty(joinLinks) ) return message.error('多个维表需要创建关联关系才能生成SQL')
    if (_.isEmpty(joinLinks) && tables.length > 1) {
      throw new Error('多张表需要建立链接')
    }
    
    let tableName = ''
    if (_.isEmpty(joinLinks)) {
      let table = tableIdDict[tables[0].id]
      if (!table) {
        throw new Error('存在已经删除了的表格，无法生成 sql')
      }
      tableName = dimInfoToSQL({dsId: table.data_source_id, tableName: table.name, fieldName: ''})
    } else {
      tableName = dealWithJoinLinks(joinLinks, tables.length)
    }
    
    let cols = outputCols.map(oc => {
      const { dimId, idxId, renameTo, omitInGroupByMode, castTo, parseDateFormat, castToDateFormat } = oc
      if (dimId) {
        if (isCalcTypeEqGroupBy && omitInGroupByMode) {
          return null
        }
        let [ tableId, fieldName ] = dimId.split('/')
        const table = tableIdDict[tableId]
        const finalFieldName = _.snakeCase(renameTo || fieldName)
        const dimClause = dimInfoToSQL({dsId: table.data_source_id, tableName: table.name, fieldName, castTo, parseDateFormat, castToDateFormat})
        return {
          colClause: `${dimClause}${finalFieldName === fieldName ? '' : ` as ${finalFieldName}`}`,
          groupByName: dimClause
        }
      }
      if (idxId) {
        const { name, formula_info: { ast, isCalcDim } } = idxIdDict[idxId]
        //此处三个条件都为必须条件
        if (!isCalcDim) {
          // 聚合型指标，输出大宽表时不输出，同步到指标管理，在多维分析实时计算
          if (!isCalcTypeEqGroupBy) {
            return null
          }
          // groupby 模式，聚合型指标将会输出成数值列
          const aggClause = handleAggregationIdxAst(ast)
          const colName = _.snakeCase(renameTo || name)
          return {
            colClause: `${aggClause} as ${colName}`
          }
        }
        
        // 非聚合型指标
        let dimClause = handleCalcDimAst(ast)
        const colName = _.snakeCase(renameTo || name)
        return {
          colClause: `${dimClause} as ${colName}`,
          groupByName: dimClause
        }
      }
    }).filter(_.identity)
    
    let columns = cols.map(c => c.colClause).join(', ')
    if (!columns) {
      throw new Error('没有勾选任何维度')
    }
    
    const groupByClause = isCalcTypeEqGroupBy
      ? ` group by ${cols.filter(c => c.groupByName).map(c => c.groupByName).join(', ')}`
      : ''
    const whereClause = _.isEmpty(filters) ? '' : ` where ${filters.map(singleFilterToSQL).join(' and ')} `
    const offlineModelWhere = _.isEmpty(offlineModelFilter) ? '' : ` where ${offlineModelFilterToSql()} `
    let sql = `select ${columns} from ${tableName} ${whereClause} ${offlineModelWhere} ${groupByClause}`
    return _.trim(sql)
  }
  
  return genSqlExpression()
}

export function guessDruidTypeByDbDataType(dbType) {
  let dbTypeLowerCase = (dbType || '').toLowerCase()
  if (/text|clob|graphic|blob|binary|image|json|xml|raw|file/.test(dbTypeLowerCase)) {
    return DruidColumnType.Text
  }
  if (/char|uid|rowid|enum|set/.test(dbTypeLowerCase)) {
    return DruidColumnType.String
  }
  // 暂时不支持，先清洗成 string
  // if (/bigdecimal|bigserial|bigint/.test(dbTypeLowerCase)) {
  //   return DruidColumnType.BigDecimal
  // }
  if (/double|real|num|decimal|dec|money/.test(dbTypeLowerCase)) {
    return DruidColumnType.Double
  }
  if (/long/.test(dbTypeLowerCase)) {
    return DruidColumnType.Long
  }
  if (/^int|int$|bit|bool|byte|serial/.test(dbTypeLowerCase)) {
    return DruidColumnType.Int
  }
  if (/float/.test(dbTypeLowerCase)) {
    return DruidColumnType.Float
  }
  if (/date|time/.test(dbTypeLowerCase)) {
    return DruidColumnType.Date
  }
  return DruidColumnType.String
}

export function guessDruidStrTypeByDbDataType(dbType) {
  let druidType = guessDruidTypeByDbDataType(dbType)
  return DruidNativeType[druidType] || 'STRING'
}

export function guessSimpleTypeByDbDataType(dbType) {
  let druidType = guessDruidTypeByDbDataType(dbType)
  return DruidType[druidType] || 'STRING'
}
