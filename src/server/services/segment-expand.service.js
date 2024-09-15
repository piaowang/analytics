/*
 * 用户扩群服务
 */
import db from '../models'
import conf from '../config'
import {
  err
} from '../utils/log'
import segmentService from '../services/segment.service'
import _ from 'lodash'
import fetch from '../utils/fetch-kit'
import statusMap from '../../common/segment-status-map'
import {UsergroupFilterStrategyEnum, UserGroupFilterTypeEnum, UserGroupSetOperationEnum} from '../../common/constants'
let {pioUrl, seUrl} = conf
const url = (seUrl || pioUrl) + '/pio/userextension'
const codeMap = {
  0: '正常',
  1000: '计算出错了',
  1001: '当前的条件查询不到数据，请尝试修改时间，特征指标等查询条件',
  1002: '当前分群无法查询到数据，请尝试其他分群',
  1003: '获取数据超时了',
  1004: '暂时不支持非数值指标',
  1005: '当前筛选条件下的用户与参考用户群完全一致，无法扩群，请尝试更换指标，参考用户群或者修改日期范围'
}

const getMessage = res => {
  let msg = codeMap[res.code || ''] || res.message || ''
  return msg.slice(0, 499)
}

const createBodyFromInst = (inst, host) => {
  let {
    datasource_id: druid_datasource_id,
    usergroup_id,
    params: {
      since,
      until,
      relativeTime,
      groupby,
      alg,
      limit: maxUser,
      measures: metrics
    }
  } = inst
  return {
    druid_datasource_id,
    since,
    until,
    relativeTime,
    timezone: 'Asia/Shanghai',
    dimensions: [groupby],
    metrics,
    granularity: 'P1D',
    dimensionExtraSettings: [{
      limit: 10,
      sortDirect: 'desc',
      'sortCol': metrics[0]
    }],
    groupByAlgorithm: 'groupBy',
    filters: [{
      col: groupby,
      op: 'lookupin',
      eq: usergroup_id
    }],
    alg,
    host,
    maxUser
  }
}

//通过后台接口创建
/*
## 创建或者更新id为id的扩群
url: /create/:id
type: application/json
method: post
body: {
 "druid_datasource_id": "SJ9o92XGl",
 "since":"2017-03-20 23:59:59",
 "until":"2017-03-23 23:59:59",
 "relativeTime": "-3 days",
 "timezone":"Asia/Shanghai",
 "dimensions":["UserID"],
 "metrics":[
   "wuxianjiRT_total",
   "wuxianjiRT_ryQXN3adl",
   "fh","wuxianjiRT_BJi2qiIje",
   "test9"
  ],
  "granularity":"P1D",
  "dimensionExtraSettings":[
    {
      "limit":10,
      "sortDirect":"desc",
      "sortCol":"wuxianjiRT_total"
    }
  ],
  "groupByAlgorithm":"groupBy",
  "filters": [{
    "col": "UserID",
    "op": "lookupin",
    "eq": "HkMHq82Te"
  }]
}

返回结果
status 状态 0:未计算， 1:计算中, 2:计算完成, 3: 计算失败
count 扩群id计数(如果已经很快计算出来了)
{
  message: '',
  status: 1,
  code: 0/1000/1001/1002
  count: 0
}
*/

const remoteCreate = async(inst, host) => {
  let uid = createRemoteId(inst)
  let link = `${url}/create/${uid}`
  let body = createBodyFromInst(inst, host)
  try {
    debug('======================')
    debug('id:', uid)
    debug('url:', link)

    debug(body)
    debug(
      'test-link',
      `http://192.168.0.67:8090/api/query-druid?qs=${encodeURIComponent(JSON.stringify(body))}`
    )
    debug(
      'test-link',
      `http://192.168.0.67:8090/api/query-druid?qs=${encodeURIComponent(JSON.stringify(
        _.omit(body, 'filters')
      ))}`
    )

    let res = await fetch.post(link, body)
    return res
  } catch (e) {
    err(e.stack)
    return {
      error: e.message
    }
  }
}

//通过后台接口删除
/*
## 删除扩群
url: /delete/:id
method: delete
type: application/json
返回200状态码即可
*/
const remoteDel = async(id) => {
  let uid = createRemoteId(id)
  let link = `${url}/delete/${uid}`
  try {
    await fetch.delete(link)
    debug('======================')
    debug('id:', uid)
    debug('url:', link)
    return 'ok'
  } catch (e) {
    err(e.stack)
    return {
      error: e.message
    }
  }
}

/**
## 查询扩群状态
url: /status/:id
method: get
type: application/json

返回结果
{"status": 2, "count": 3409}
 */
const remoteQueryStatus = async(id) => {
  let uid = createRemoteId(id)
  let link = `${url}/status/${uid}`
  try {
    let res = await fetch.get(link)
    debug('======================')
    debug('id:', uid)
    debug('url:', link)
    debug('result:', res)
    return res
  } catch (e) {
    err(e.stack)
    return {
      error: e.message
    }
  }
}

/*
## 查询扩群id列表
url: /query/:id
method: get
type: application/json

返回结果
{"ids":["aaaa","xxxxxxx","yyyyyyy"], count: 3409 }
*/
const remoteQuery = async(id) => {
  let uid = createRemoteId(id)
  let link = `${url}/query/${uid}`
  try {
    let res = await fetch.get(link)
    return res
  } catch (e) {
    err(e.stack)
    return {
      error: e.message
    }
  }
}

//构建后台存储id
const createRemoteId = (inst) => {
  return `segment_expanded_${inst.id || inst}`
}

/*
 * 创建扩群
 * @param {string} usergroup_id 分群id
 * @param {object} params 扩群条件
 * @return {object} 如果出错，返回 {error: 'xxx'}, 正确返回 {created: {createdSegmentExpandObject}}
 */
const create = async({
  usergroup_id,
  created_by,
  title,
  datasource_id,
  params,
  host,
  description,
  company_id
}) => {

  if (!datasource_id) {
    return {
      error: '缺少必要参数datasource_id'
    }
  }

  let def = {
    usergroup_id,
    created_by,
    updated_by: created_by,
    title,
    datasource_id,
    params,
    host,
    description,
    company_id
  }

  let query = {
    where: {
      title,
      company_id
    }
  }

  let results = await db.SegmentExpand.findOrCreate({
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
  let remoteCreateResult = await remoteCreate(created, host)
  if (typeof remoteCreateResult.count === 'undefined') {
    await db.SegmentExpand.destroy({
      where: {
        id: created.id
      }
    })
    return remoteCreateResult
  } else {
    let {
      count,
      status
    } = remoteCreateResult
    await db.SegmentExpand.update({
      count,
      status,
      message: statusMap[status]
    }, {
      where: {
        id: created.id,
        company_id
      }
    })
    created.count = count
    created.status = status
  }
  return created

}

/*
 * 删除扩群
 * @param {string} id 扩群id
 * @return {object} 删除结果
 */
const del = async({
  id,
  company_id
}) => {
  await remoteDel(id)
  return await db.SegmentExpand.destroy({
    where: {
      id,
      company_id
    }
  })
}

/*
 * 更新扩群
 * @param {string} id 扩群id
 * @return {object} 删除结果
 */
const update = async({
  id,
  host,
  company_id,
  updated_by,
  updateObj
}) => {
  let res = {}
  let q = {
    where: {
      id,
      company_id
    }
  }
  if (
    updateObj.params ||
    updateObj.datasource_id ||
    updateObj.usergroup_id
  ) {
    let inst = await db.SegmentExpand.findOne(q)
    let ins = inst.get({plain: true})
    Object.assign(ins, updateObj)
    res = await remoteCreate(ins, host)
  }

  updateObj.updated_by = updated_by
  if (_.isNumber(res.status)) {
    updateObj.status = res.status
    updateObj.count = res.count
    updateObj.message = getMessage(res)
  }

  //重名检测
  if (updateObj.title) {
    let eg = await db.SegmentExpand.findOne({
      where: {
        company_id,
        title: updateObj.title
      }
    })
    if (eg && eg.id !== id) {
      throw new Error('名字已经存在，请换一个名称')
    }
  }

  await db.SegmentExpand.update(
    updateObj,
    q
  )

  return {
    count: res.count,
    status: res.status,
    message: res.message || ''
  }
}

/*
 * 查询扩群状态
 * @param {string} id 扩群id
 * @return {object} 结果
 */
const queryStatus = async({
  id,
  company_id
}) => {
  let res = await remoteQueryStatus(id)
  let updateInfo = false
  if (_.isNumber(res.status)) {
    updateInfo = {
      status: res.status,
      code: res.code,
      message: getMessage(res)
    }
  }
  if (_.isNumber(res.count)) {
    updateInfo.count = res.count
  }
  if (!updateInfo) {
    return res
  }
  await db.SegmentExpand.update(updateInfo, {
    where: {
      id,
      company_id
    }
  })

  return updateInfo
}

/*
 * 查询扩群ids
 * @param {string} id 扩群id
 * @return {object} 结果
 */
const queryIds = async({
  id,
  company_id
}) => {
  let res = await remoteQuery(id)
  if (res.count) {
    await db.SegmentExpand.update({
      count: res.count
    }, {
      where: {
        id,
        company_id
      }
    })
  }
  return res
}

/*
 * 另存为分群
 * @param {string} id 扩群id
 * @return {object} 结果
 */
const saveAsUsergroup = async({
  id,
  title,
  user
}) => {
  let {
    company_id,
    id: user_id
  } = user
  let res = await remoteQuery(id)
  if (res.count) {
    await db.SegmentExpand.update({
      count: res.count
    }, {
      where: {
        id,
        company_id
      }
    })
  }
  let se = await db.SegmentExpand.findOne({
    where: {
      id
    }
  })
  let {
    datasource_id,
    params: {
      relativeTime,
      groupby,
      since,
      until
    }
  } = se
  let ds = await db.SugoDatasources.findOne({
    where: {
      id: datasource_id
    }
  })
  let usergroup = {
    druid_datasource_id: datasource_id,
    datasource_name: ds.name,
    title,
    usergroupIds: res.ids,
    params: {
      dimension: {
        relation: 'and',
        filters: []
      },
      measure: {
        relation: 'and',
        filters: []
      },
      measure3: {
        relation: 'and',
        filters: []
      },
      backToRefererTitle: '查看关联扩群',
      backToRefererHint: '这个分群由用户扩群id上传创建，点击查看扩群',
      refererLink: `/console/segment-expand/${id}`,
      relativeTime: relativeTime || '-7 days',
      groupby,
      since,
      until,
      dataConfig: conf.dataConfig,
      createMethod: 'by-upload',
      composeInstruction: [{ op: UserGroupSetOperationEnum.union, type: UserGroupFilterTypeEnum.userGroupFilter }],
      usergroupFilterStrategy: UsergroupFilterStrategyEnum.byUpload
    }
  }

  let r = await segmentService.add({
    usergroup,
    user_id,
    company_id
  })
  return r.result

}

export default {
  create,
  del,
  update,
  queryStatus,
  saveAsUsergroup,
  queryIds
}
