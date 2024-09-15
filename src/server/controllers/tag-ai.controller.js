/**
 * 智能画像 控制器
 * 查询/创建 智能画像需要 imgId，前端没有 imgId 的概念，前端只会传分群 id 过来
 *
 * 如果传过来的是临时分群（temp_usergroup_md5），则需要创建一个 tempLookup 然后使用 tempLookup 的 id 生成 imgId
 * 注意：创建 tempLookup 的同时会同步 lookup，这个 tempLookup 会包含原临时分群的 md5
 *
 * 最终使用的 imgId 格式：img_ugId / img_tempLookupId
 */

import {returnError, returnResult} from '../utils/helper'
import topTagSrv from '../services/top-tag.service'
import segSrv from '../services/segment.service'
import {tempLookupSrvInst as tempLookupSrv} from '../services/temp-lookups.service'
import _ from 'lodash'
import {delayPromised, immutateUpdate} from '../../common/sugo-utils'
import {withFetchErrHandler} from '../utils/fetch-kit'
import {redisDel, redisGet, redisSetExpire} from '../utils/redis'
import moment from 'moment'
import TempLookupsService from '../services/temp-lookups.service'

const WAIT_TIME_IN_SECONDS = 120

const queryCreateStatus = withFetchErrHandler(async ctx => {
  const { company_id, id: userId } = ctx.session.user

  // 判断该分群是否临时分群，否的话直接查询智能分群接口，是的话检查 lookups 列表
  let {usergroup_id} = ctx.q
  if (!usergroup_id) {
    returnError(ctx, 'No usergroup_id provided!')
    return
  }
  if (!_.startsWith(usergroup_id, 'temp_usergroup_')) {
    let queryStatusRes = await topTagSrv.status(`img_${usergroup_id}`)
    returnResult(ctx, queryStatusRes)
    return
  }

  let md5 = usergroup_id.replace('temp_usergroup_', '')
  // 判断近 2 分钟是否已经创建了临时分群，是的话检查 lookup 列表，否的话返回未计算
  let tempLookup = await TempLookupsService.getInstance().findOne({
    params: {md5},
    company_id,
    created_at: {$gt: moment().add(-WAIT_TIME_IN_SECONDS, 'seconds').toDate()}
  })
  if (!tempLookup) {
    returnResult(ctx, {status: 0, message: '未计算'})
    return
  }
  let {uIndexLookupListenerDict} = await segSrv.queryLookupListenerDict() || {}
  let lookupName = _.get(tempLookup, 'params.dataConfig.groupId')
  if (lookupName in uIndexLookupListenerDict) { // 只检查 uIndexLookups ？
    // 已经创建了 lookup，查询
    let waitingKey = `waitingLookupCreationSet.${tempLookup.id}`
    let isWaiting = await redisGet(waitingKey)
    if (isWaiting) {
      returnResult(ctx, {
        status: 1,
        message: '计算分群中...'
      })
    } else {
      let statusRes = await topTagSrv.status(`img_${tempLookup.id}`)
      returnResult(ctx, statusRes)
    }
  } else {
    returnResult(ctx, {
      status: 1,
      message: '计算分群中...'
    })
  }
})

async function waitUntilUsergroupCreateSuccess(ugId, retryTimes = WAIT_TIME_IN_SECONDS / 10) {
  if (retryTimes <= 0) {
    return false
  }
  await delayPromised(10 * 1000)
  let {uIndexLookupListenerDict} = await segSrv.queryLookupListenerDict() || {}
  if (!(ugId in uIndexLookupListenerDict)) {
    return await waitUntilUsergroupCreateSuccess(ugId, retryTimes - 1)
  } else {
    return true
  }
}

const create = withFetchErrHandler(async ctx => {
  // 判断 ug 是否临时分群，否的话直接创建智能画像，否的话先创建 tempLookups
  const { company_id, id: userId } = ctx.session.user
  let {usergroup_id, tempUsergroup} = ctx.q

  if (!usergroup_id) {
    returnError(ctx, 'No usergroup_id provided!')
    return
  }

  if (!_.startsWith(usergroup_id, 'temp_usergroup_')) {
    let createResult = await topTagSrv.create(`img_${usergroup_id}`, {usergroup_id: `usergroup_${usergroup_id}`})
    returnResult(ctx, createResult)
    return
  }

  let md5 = usergroup_id.replace('temp_usergroup_', '')
  let tempLookup = await TempLookupsService.getInstance().findOne({
    params: {md5},
    company_id,
    created_at: {$gt: moment().add(-WAIT_TIME_IN_SECONDS, 'seconds').toDate()}
  })
  if (!tempLookup) {
    let tempUsergroup0 = {..._.omit(tempUsergroup, 'id'), company_id, created_by: userId}
    tempUsergroup0 = immutateUpdate(tempUsergroup0, 'params.md5', () => md5)
    tempLookup = await TempLookupsService.getInstance().createAndLookup(tempUsergroup0)

    // 在线程里等待，直到 lookup 创建成功，再创建 智能画像
    let waitingKey = `waitingLookupCreationSet.${tempLookup.id}`
    let isWaiting = await redisGet(waitingKey)
    if (!isWaiting) {
      let tempUgId = _.get(tempLookup, 'params.dataConfig.groupId')
      setTimeout(async () => {
        await redisSetExpire(waitingKey, WAIT_TIME_IN_SECONDS, '1')
        let res = await waitUntilUsergroupCreateSuccess(tempUgId)
        await redisDel(waitingKey)
        if (res) {
          debug('lookup 创建成功')
          topTagSrv.create(`img_${tempLookup.id}`, {usergroup_id: tempUgId})
        }
      }, 1)
    }
    returnResult(ctx, {status: 1, message: '计算中...'})
    return
  }
  // 判断 lookup 是否已经同步
  let {uIndexLookupListenerDict} = await segSrv.queryLookupListenerDict() || {}
  let lookupName = _.get(tempLookup, 'params.dataConfig.groupId')
  if (!(lookupName in uIndexLookupListenerDict)) {
    returnResult(ctx, {status: 1, message: '计算分群中...'})
    return
  }
  let createRes = await topTagSrv.create(`img_${tempLookup.id}`, {usergroup_id: lookupName})
  returnResult(ctx, createRes)
})

const query = withFetchErrHandler(async ctx => {
  const { company_id, id: userId } = ctx.session.user
  let {usergroup_id} = ctx.q
  if (!usergroup_id) {
    returnError(ctx, 'No usergroup_id provided!')
    return
  }

  if (!_.startsWith(usergroup_id, 'temp_usergroup_')) {
    returnResult(ctx, await topTagSrv.query(`img_${usergroup_id}`))
    return
  }
  let md5 = usergroup_id.replace('temp_usergroup_', '')

  let tempLookup = await TempLookupsService.getInstance().findOne({
    params: {md5},
    company_id,
    created_at: {$gt: moment().add(-WAIT_TIME_IN_SECONDS, 'seconds').toDate()}
  })
  if (!tempLookup) {
    returnError(ctx, '未计算', 404)
    return
  }
  // 判断 lookup 是否已经同步
  let {uIndexLookupListenerDict} = await segSrv.queryLookupListenerDict() || {}
  let lookupName = _.get(tempLookup, 'params.dataConfig.groupId')
  if (!(lookupName in uIndexLookupListenerDict)) {
    returnError(ctx, '创建临时分群中...')
    return
  }

  let res = await topTagSrv.query(`img_${tempLookup.id}`)
  returnResult(ctx, res)

  /************test
   let res
   if (action === 'query') {
    let arr = `location_airline_top2
location_airline_top1
location_from_top2
location_from_top1
location_to_top2posµ
location_to_top3
location_to_top1
location_from_top3
value_fareclass
value_order_bp`.split('\n')

    res = {
      result: new Array(10).fill(0).map((n, i) => {
        return {
          dimension: arr[i], //维度名
          tagName: '老年' + i, //标签名称
          value: '60`70', //标签取值
          f: 0.85 - i * 0.08, //基尼系数
          ratio: Math.random(), //整体比例
          ratioCompare: Math.random(), //非目标群体比例
          ratioUsergroup: Math.random() //目标群体比例
        }
      }),
      lastComputeTime: new Date()
    }
  } else if (action === 'create') {
    res = {
      status: 1,
      code: 0,
      lastComputeTime: new Date()
    }
  } else if (action === 'status') {
    res = {
      status: 2,
      code: 0,
      lastComputeTime: new Date()
    }
  }
   ***********test */
})


export default {
  queryCreateStatus,
  create,
  query
}
