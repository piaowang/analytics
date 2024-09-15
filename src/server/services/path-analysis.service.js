/*
 * 用户路径分析服务
 */
import db from '../models'
import conf from '../config'
import {err} from '../utils/log'
import fetch from '../utils/fetch-kit'
import CryptoJS from 'crypto-js'
import cacheService from './cache'
import DruidService from './druid-query.service'
import _ from 'lodash'
import {generate} from 'shortid'
import moment from 'moment'
//import mockData from './temp-pa-data.gen'

let {pioUserGroupUrl} = conf
const url = pioUserGroupUrl + '/ant/process/pa/'

//由查询参数创建cache key
const createCacheKey = (q, direction) => {
  return CryptoJS.MD5(JSON.stringify(q)).toString() + direction
}

//http://ip:port/pio/process/pa/normal
//http://ip:port/pio/process/pa/reverse
/**
 * 查询路径分析
 * @param {*} q
 * @param {*} host 
 */
const remoteQuery = async(q, direction) => {

  /*
ctx.q ==> {
  "query": {
    "dataSource": "com_SJLnjowGe_project_rkPsIyj0g",
    "dimension": {
      "sessionId": "session_id",
      "pageName": "page_name",
      "userId": "distinct_id",
      "date": "__time"
    },
    "homePage": "INSPINIA | Dashboard",
    "startDate": "2017-05-23T16:00:00.000Z",
    "endDate": "2017-06-22T15:59:59.999Z",
    "filters": [
      {
        "action": "lookup",
        "value": "usergroup_SytzPbTMb",
        "dimension": "distinct_id"
      }
    ]
  },
  "direction": "normal"
}

*/

  let cacheKey = createCacheKey(q, direction)
  let params = {
    druid_datasource_id: q.datasource_id,
    datasource_name: q.dataSource,
    since: q.startDate,
    until: q.endDate,
    filters: q.filters,
    vizType: 'table_flat',
    groupByAlgorithm: 'groupBy',
    splitType: 'groupBy',
    timezone: 'Asia/Shanghai',
    dimensions: [q.dimension.pageName],
    customMetrics: [{
      name: generate(),
      formula: '$main.count()',
      dimParams: {}
    }]
    // dimensionExtraSettingDict: {
    //   [q.dimension.userId]: {
    //     limit: 10,
    //     sortDirect: 'desc',
    //     sortCol: q.dimension.userId
    //   }
    // }
  }

  let druidQuery = await DruidService.createQuery(params)
  q.filters = _.get(druidQuery, 'filter') || undefined
  q.startDate = moment(q.startDate).toISOString()
  q.endDate = moment(q.endDate).toISOString()
  q.broker = conf.druid.host
  q.direction = direction
  //return mockData
  try {
    debug('======================')
    debug('query:', q)
    debug('url:', url)
    debug('direction:', direction)
    let res = await fetch.post(url, q)
    return res
  } catch (e) {
    err(e.stack)
    return {
      error: e.message
    }
  }
}

/*
 * 创建路径分析
 * @param {string} datasource_id 数据源id
 * @param {object} params 路径分析条件
 * @return {object} 如果出错，返回 {error: 'xxx'}, 正确返回 {}
 */
const create = async({
  created_by,
  title,
  datasource_id,
  params,
  company_id
}) => {

  if (!datasource_id) {
    return {
      error: '缺少必要参数datasource_id'
    }
  }

  let def = {
    created_by,
    updated_by: created_by,
    title,
    datasource_id,
    params,
    company_id
  }

  let query = {
    where: {
      title,
      company_id,
      datasource_id
    }
  }

  let results = await db.PathAnalysis.findOrCreate({
    ...query,
    defaults: def
  })
  let flag = results[1]
  if (!flag) {
    return {
      error: '名字已经存在，请换一个名称'
    }
  }
  let created = results[0]
  return created

}

/*
 * 删除路径分析
 * @param {string} id 路径分析id
 * @return {object} 删除结果
 */
const del = async({
  id,
  company_id
}) => {
  return await db.PathAnalysis.destroy({
    where: {
      id,
      company_id
    }
  })
}

/*
 * 更新路径分析
 * @param {string} id 路径分析id
 * @return {object} 删除结果
 */
const update = async({
  id,
  company_id,
  updated_by,
  updateObj
}) => {
  let q = {
    where: {
      id,
      company_id
    }
  }

  updateObj.updated_by = updated_by

  //重名检测
  if (updateObj.title) {
    let eg = await db.PathAnalysis.findOne({
      where: {
        company_id,
        title: updateObj.title,
        datasource_id: updateObj.datasource_id,
        id: {
          $ne: id
        }
      }
    })
    if (eg) {
      throw new Error('名字已经存在，请换一个名称')
    }
  }

  await db.PathAnalysis.update(
    updateObj,
    q
  )

  return 'ok'
}

/*
 * 查询路径分析数据
 * @param {object} query 路径分析条件
 * @return {object} 结果
 */
const queryChart = async({
  query,
  direction
}) => {
  return await remoteQuery(query, direction)
}

export default {
  create,
  del,
  update,
  queryChart
}
