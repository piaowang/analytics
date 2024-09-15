import db from '../models'
import {Expression, RefExpression} from 'sugo-plywood'
import { returnError, returnResult } from '../utils/helper'
import _ from 'lodash'
import {checkLimit} from '../utils/resouce-limit'
import {generate} from 'shortid'
import {err} from '../utils/log'
import {permissionControl} from './sugo-datasources.controller'
import {genSortedOrder} from '../../common/generate-sorted-data'
import checkInStr from '../../common/check-str-in-arr'
import {translateFormula} from '../utils/relative-time-tranform'
import { convertContainsByDBType } from './convert-contains-where'

const measures = {
  /** 查询列表数据 */
  getMeasures: async ctx => {

    let {user} = ctx.session
    let {company_id} = user || {}
    let id = ctx.params.id || 0
    let offset = ctx.query.offset || 0
    let limit = ctx.query.limit || 999
    let noauth = ctx.query.noauth || ''
    let search = ctx.query.name ? decodeURIComponent(ctx.query.name) : ''
    let {tags = [], noSort} = ctx.query

    if (!id) {
      throw new Error('别闹，id不能为空啊')
    }
    let query = {
      parentId: id,
      company_id
    }
    if (search) {
      query.name = search
    }

    if(!_.isEmpty(tags)) {
      tags = tags.split(',')
      Object.assign(query, {
        $or: tags.map(r => convertContainsByDBType('tags', r))
      })
    }

    let q = {
      where: query,
      offset: offset,
      limit: limit,
      order: [
        ['updatedAt', 'DESC']
      ]
    }
    if(!noauth) permissionControl(q, user)

    let resp = await db.SugoMeasures.findAndCountAll(q)
    let result = resp.rows

    //判断是否需要排序/隐藏 
    if(!noSort) {
      let myOrders = await db.SugoCustomOrders.findOne({
        where: {
          druid_datasource_id: id,
          user_id: null
        }
      })
      myOrders = _.isEmpty(myOrders) ? []: myOrders.metrics_order
      result = genSortedOrder(result, myOrders)
    }

    ctx.body = {
      total: resp.count,
      data: result
    }
  },
  /** 保存 */
  addMeasure: async ctx => {
    let body = ctx.q
    let {user} = ctx.session
    let {company_id, id} = user
    let parentId = ctx.params.id || 0
    let {
      name,
      title,
      type,
      aggregate,
      user_ids,
      role_ids,
      formula,
      params,
      pattern,
      tags
    } = body
    if (!name) {
      throw new Error('别闹，名字不能为空啊')
    }
    let agg = aggregate || []
    //Search for a specific element or create it if not available
    await checkLimit(ctx, 'measure')
    let uid = generate()
    let defs = {
      id: uid,
      title,
      type,
      name,
      params,
      formula,
      user_ids,
      role_ids,
      aggregate: agg.join(','),
      company_id,
      created_by: id,
      pattern,
      tags
    }
    let result = await db.SugoMeasures.findOrCreate({
      where: {
        name: name,
        parentId: parentId,
        company_id
      }, //根据parentId和name去重严重
      defaults: defs
    }) //.catch(err => console.log('===========upd'+err));
    let flag = result[1]
    if (!flag) {
      return returnError(ctx, '这个名字已经有了，换一个吧')
    }
    returnResult(ctx, defs)
  },

  /** 更新 */
  editMeasure: async ctx => {
    let body = ctx.q
    let id = ctx.params.id || ''
    if (!id) {
      throw new Error('别闹，id不能为空啊')
    }
    let update = _.pick(body, [
      'title',
      'formula',
      'user_ids',
      'role_ids',
      'params',
      'pattern',
      'type',
      'tags'
    ])

    //检查name是否被占用
    let {user} = ctx.session
    let {company_id} = user
    let obj = await db.SugoMeasures.findOne({
      where: {
        id,
        company_id
      }
    })
    if (!obj) return returnError(ctx, '资源不存在', 404)
    let result = await obj.update(update)

    returnResult(ctx, result)
  },
  
  /** 删除 */
  deleteMeasure: async ctx => {

    let {names} = ctx.q
    let {user} = ctx.session
    let {company_id, id} = user
    if (!names || !_.isArray(names) || !names.length) return returnError(ctx, '维度名不能为空')
    //check slice
    let query = {
      where: {
        company_id
      }
    }

    let existInSlice = await db.Slices.findAll(query)

    let sliceNames = existInSlice.filter(bm => {
      let str = JSON.stringify(bm.params)
      return names.reduce((prev, curr) => {
        return prev || str.indexOf('"' + curr + '"') > -1
      }, false)
    })
      .map(s => s.slice_name).join(',')
    if (sliceNames.length) {
      return returnError(
        ctx,
        `指标${names.join(',')}已经被单图： ${sliceNames} 使用，不能删除`
      )
    }

    //check bookmark
    let ids = await db.SugoUser.findAll({
      where: {
        company_id
      }
    })
    ids = ids.map(d => d.id)
    let query1 = {
      where: {
        user_id: {
          $in: ids
        }
      }
    }
    let existInBm = await db.SugoPivotMarks.findAll(query1)
    let bmNames = existInBm.filter(bm => {
      let str = JSON.stringify(bm.queryParams)
      return names.reduce((prev, curr) => {
        return prev || str.indexOf('"' + curr + '"') > -1
      }, false)
    })
      .map(s => s.name).join(',')
    if (bmNames.length) {
      return returnError(
        ctx,
        `指标${names.join(',')}已经被书签： ${bmNames} 使用，不能删除`
      )
    }

    //check segment
    let existInSg = await db.Segment.findAll({
      where: {
        company_id
      },
      attributes: ['title', 'params']
    })
    let sgNames = existInSg.filter(ds => {
      let {
        measure3 = {}
      } = ds.params
      return checkInStr(JSON.stringify(measure3), names)
    })
      .map(s => s.title).join(',')

    if (sgNames.length) {
      return returnError(
        ctx,
        `指标${names.join(',')}已经被分群： ${sgNames} 使用，不能删除`
      )
    }

    let result = await db.SugoMeasures.destroy({
      where: {
        name: {
          $in: names
        },
        company_id
      }
    })

    returnResult(ctx, result)

  },

  //验证指标表达式是否合法
  validFormula: async ctx => {

    try {
      const { formula } = ctx.q
      const expression = Expression.parse(translateFormula(formula))
      // const dimensions = expression.getFreeReferences()
      if (formula.indexOf('$') === -1) {
        return returnError(ctx, `表达式错误，未匹配到维度字段"${formula}"`, 200)
      }
      if (formula.indexOf('$main.count()') > -1) {
        return returnResult(ctx, null)
      }
      //let regex = /(\$[^main][A-Za-z\w_]{1,49})/gi;
      let regex = /(\$[\w_]+)|(\$\{[\w.]+\})/gi
      let results = _.without(formula.match(regex), '$main')
      var nameSet = new Set()
      for (let item of results) {
        nameSet.add(item.replace(/[$|}|{]/gi, ''))
      }
      //console.log(Array.from(nameSet));
      //查询匹配的到的维度字段且必须为数据源存在的维度
      let queryResult = await db.client.query('SELECT COUNT(*) as total FROM sugo_dimensions WHERE name IN(:names)', {
        replacements: {
          names: Array.from(nameSet)
        },
        type: db.client.QueryTypes.SELECT
      })
      //console.log(queryResult+"==="+nameSet.size)
      if (queryResult[0].total < nameSet.size) { //如果查询出来的结果跟匹配的结果不同则表明有错误的维度信息
        return returnError(ctx, `表达式错误，表达式包含的维度必须是非STRING类型的维度name[${Array.from(nameSet)}]`, 200)
      }
      // TODO 解析expression验证括号内的字段信息
      returnResult(ctx, null)
    } catch(e) {
      err(e)
      returnError(ctx, e.message || e.stack, 200)
    }
  },

  // 将指标的公式转换为自助分析的 filters
  // 例如 $main.filter($Province.in(['xxx'])).count() => {col: 'Province', op: 'in', eq: ['xxx']}
  convertFormulaToFilters: async ctx => {
    let { formula } = ctx.q
    let translatedFormula = translateFormula(formula)
    let expObj = Expression.parse(translatedFormula)
    let filters = extractFilters(expObj)
    returnResult(ctx, filters)
  }
}

export default measures

function getRefExp(exp) {
  if (!exp) {
    return null
  }
  if (exp instanceof RefExpression) {
    return exp
  }
  return getRefExp(exp.operand) || getRefExp(exp.expression)
}

function extractFilters(exp) {
  if (!exp) {
    return []
  }
  let {op, operand, expression} = exp
  switch (op) {
    case 'add':
    case 'and':
      return extractFilters(operand).concat(extractFilters(expression))
    case 'subtract':
      return extractFilters(operand).concat(extractFilters({op: 'not', operand: expression}))
    case 'count':
      return extractFilters(operand)
    case 'filter':
      if (operand && operand.constructor.name === 'FilterExpression') {
        return extractFilters(operand).concat(extractFilters(expression))
      }
      return extractFilters(expression)
    case 'in':
      return [{col: operand.name, op, eq: expression.value.elements}]
    case 'contains':
    case 'greaterThan':
    case 'greaterThanOrEqual':
    case 'lessThanOrEqual':
    case 'lessThan':
      if (expression.constructor.name === 'RefExpression') {
        // 1 < x : operand: 1, op: lessThan, exp: x
        const fixOp = _.startsWith(op, 'lessThan')
          ? op.replace('lessThan', 'greaterThan')
          : _.startsWith(op, 'greaterThan') ? op.replace('greaterThan', 'lessThan') : op
        return [{ col: expression.name, op: fixOp, eq: [operand.value] }]
      }
      return [{col: _.get(getRefExp(operand), 'name'), op, eq: [expression.value]}]
    case 'is':
      return [{col: operand.name, op: 'equal', eq: [expression.value]}]
    case 'not':
    case 'negate': {
      let beforeNot = extractFilters(operand)
      return beforeNot.map(flt => ({...flt, op: _.startsWith(op, 'not ') ? op.substr(4) : `not ${flt.op}`}))
    }
    case 'or':
      return [{ op: 'or', eq: extractFilters(operand).concat(extractFilters(expression)) }]
    case 'multiply':
    case 'divide':
    case 'countDistinct':
    case 'split':
    case 'sum':
    case 'max':
    case 'min':
    case 'limit':
    case 'reciprocate':
    default:
      // throw new Error(`筛选目前不支持‘${op}’操作`)
      return []
  }
}
