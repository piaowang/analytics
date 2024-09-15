/**
 * 分群服务
 */
import db from '../models'
import {requesterWithToArray, uindexRequesterWithToArray} from '../utils/druid-middleware'
import {p2q, p2q2} from '../utils/param-transform'
import {redisExpire, redisGet, redisSetExpire} from '../utils/redis'
import conf from '../config'
import Fetch from '../utils/fetch-kit'
import {generate} from 'shortid'
import {err, log} from '../utils/log'
import _ from 'lodash'
import UserGroupService from './usergroup-redis.service'
import {
  UserGroupBuildInTagEnum,
  UsergroupFilterStrategyEnum,
  UserGroupFilterTypeEnum,
  UsergroupRecomputeStrategyEnum,
  UserGroupSetOperationEnum,
  UsergroupUpdateStrategyEnum
} from '../../common/constants'
import {immutateUpdate, immutateUpdates, isDiffBySomePath, mapAwaitAll} from '../../common/sugo-utils'
import {getDatasourcesById, getDataSourcesByIds} from './sugo-datasource.service'
import toUgFilters from '../../common/slice-filter-to-ug-filter'
import {getProjectById} from './sugo-project.service'
import RedisSchedule from './redis-schedule.service'
import {tagFiltersAdaptToOldFormat} from '../../common/param-transform'
import moment from 'moment'

const druidLookupUrl = conf.druid && conf.druid.lookupHost
const druidLookupListenUrl = conf.druid && conf.druid.lookupListenHost
const uindexLookupUrl = conf.uindex?.lookupHost
const uindexLookupListenUrl = conf.uindex?.lookupListenHost
const pioUserGroupUrl = conf.pioUserGroupUrl

/**
 * 查询单个分群
 * @param {object} query
 * @return {array}
 */
const getOne = async function (query) {
  let one = await db.Segment.findOne(query)
  return one ? [one.get({ plain: true })] : []
}

export async function getUserGroupById(ugId) {
  return ugId && await db.Segment.findByPk(ugId)
}

/**
 * 删除分群数据
 * @param {object} data
 */
async function remoteDel(data, isUindex) {
  let urlBase = isUindex ? uindexLookupUrl : druidLookupUrl
  let res = await UserGroupService.del(data)
  let status1 = res.result.success ? 200 : 400
  let url = `${urlBase}/druid/coordinator/v1/lookups/__default/${data.groupId}`
  let status2 = await Fetch.delete(url, data, {
    handleResponse: (res) => res
  }).then(r => r.status)
  return [status1, status2]
}

/**
 * 同步分群数据
 * @param {object} query
 * @return {object}
 */
async function lookup(query, isUindex) {
  let urlBase = isUindex ? uindexLookupUrl : druidLookupUrl
  let url = `${urlBase}/druid/coordinator/v1/lookups`
  let {groupId} = query.dataConfig
  let body = {
    __default: {
      [groupId]: {
        type: 'cachingLookup',
        version: generate(),
        dataFetcher: {
          ...query.dataConfig,
          ...conf.dataConfig,
          groupId
        }
      }
    }
  }

  //init request
  debug('lookup', url)
  let status = await Fetch.post(url, {}, {
    handleResponse: (res) => res
  }).then(r => r && r.status)
  debug('status', status)
  //real request
  let res = await Fetch.post(url, body)

  return { status, res }
}

/**
 * 根据是否允许跨项目创建分群的配置，在 uIndex 和 tIndex 同时创建 lookup
 * @param query
 * @param isUindex
 * @returns any
 */
export async function createOrUpdateLookup(query, isUindex) {
  let res0 = await lookup(query, isUindex)
  let shouldCreateInEveryEngine = _.get(conf, 'site.allowUserGroupCrossProject') && _.get(conf, 'uindex.lookupHost')
  if (shouldCreateInEveryEngine) {
    let res1 = await lookup(query, !isUindex)
    return {
      uindex: isUindex ? res0 : res1,
      tindex: isUindex ? res1 : res0
    }
  }
  return {[isUindex? 'uindex' : 'tindex']: res0 }
}

/**
 * 根据是否允许跨项目创建分群的配置，在 uIndex 和 tIndex 同时删除 lookup
 * @param dataConfig
 * @param isUindex
 * @returns any
 */
export async function removeLookup(dataConfig, isUindex) {
  let res0 = await remoteDel(dataConfig, isUindex)
  let shouldDelInEveryEngine = _.get(conf, 'site.allowUserGroupCrossProject') && _.get(conf, 'uindex.lookupHost')
  if (shouldDelInEveryEngine) {
    let res1 = await remoteDel(dataConfig, !isUindex)
    return {
      uindex: isUindex ? res0 : res1,
      tindex: isUindex ? res1 : res0
    }
  }
  return { [isUindex ? 'uindex' : 'tindex']: res0 }
}

/**
 * 创建分群
 * @param {object} usergroup
 * @param {string} user_id
 * @param {string} company_id
 * @param {object} transaction
 */
// async function add ({
//   usergroup,
//   user_id,
//   company_id,
//   transaction = {}
// }) {

//   let sub = _.cloneDeep(usergroup)
//   let ug = _.cloneDeep(usergroup)
//   let { params } = sub
//   let { createMethod, openWith } = params
//   let isUindex = openWith === 'tag-dict' || openWith === 'tag-enhance'
//   if (createMethod === 'by-upload') {
//     // 读入临时分群
//     if (sub.md5) {
//       let q = {
//         groupReadConfig: {
//           pageIndex: 0,
//           pageSize: 1000000
//         },
//         dataConfig: {
//           ...conf.dataConfig,
//           groupId: sub.md5
//         }
//       }
//       let res = await UserGroupService.read(q)
//       ug.usergroupIds = _.get(res, 'result.ids') || ug.usergroupIds
//     }

//     params.total = ug.usergroupIds.length
//     delete sub.usergroupIds
//     delete sub.params.md5
//     delete ug.params.md5
//   }

//   sub.created_by = user_id
//   sub.company_id = company_id
//   sub.compute_time = new Date()

//   //add to druid
//   let [result, isCreate] = await db.Segment.findOrCreate({
//     where: {
//       company_id,
//       title: usergroup.title
//     },
//     defaults: sub,
//     ...transaction,
//     raw: true
//   })
//   if (result && isCreate === false) {
//     throw new Error(`保存失败，重复的分群名称【${usergroup.title}】`)
//   }
//   ug.id = result.id
//   try {
//     let addToDruidResult
//     let query0
//     if (createMethod === 'by-upload') {
//       query0 = p2q2(ug)
//       let {
//         ids,
//         /** @type {DataConfig} */
//         //dataConfig,
//         count
//       }  = query0
//       let dataConfig = {
//         ...query0.dataConfig,
//         ...conf.dataConfig
//       }
//       let res = await UserGroupService.create(ids, dataConfig)
//       if (!res.success) throw new Error('创建分群失败, druid 返回:' + res.status)
//       addToDruidResult = [{
//         version: 'data_row',
//         event: {
//           RowCount: count,
//           groupId: dataConfig.groupId
//         }
//       }]
//     } else {
//       query0 = await p2q(ug)
//       let func = isUindex ? uindexRequesterWithToArray : requesterWithToArray
//       addToDruidResult = await func({
//         query: query0
//       })
//     }

//     //lookup init
//     await createOrUpdateLookup(query0, isUindex)

//     let query = {
//       where: {
//         id: result.id,
//         company_id
//       }
//     }

//     let update = {
//       params: ug.params
//     }
//     update.params.total = addToDruidResult[0].event.RowCount

//     let updateResult = await db.Segment.update(update, {...query, ...transaction})
//     result.params = update.params
//     return {
//       result,
//       addToDruidResult,
//       updateResult
//     }

//   } catch(e) {
//     err(e.stack)
//     await db.Segment.destroy({
//       where: {
//         id: result.id
//       }
//     })
//     throw e
//   }

//   //end
// }

const genUsergroupQueryForTindex = async (ug, idx) => {
  let tempUg = immutateUpdates(ug,
    'id', () => `${ug.id}_behavior`,
    'params', prevParams => {
      let rebuildMd5 = _.get(ug, 'params.md5') || (_.startsWith(ug.id, 'temp_usergroup_') ? ug.id.substr('temp_usergroup_'.length) : null)
      if (!rebuildMd5) {
        return _.omit(prevParams, 'openWith')
      }
      return {
        ..._.omit(prevParams, 'openWith'),
        md5: rebuildMd5
      }
    })

  // 使用用户指定的行为项目
  let relatedBehaviorProjectId = _.get(ug, 'params.relatedBehaviorProjectId')
  if (isUindexUg(ug) && relatedBehaviorProjectId) {
    let behaviorProj = await getProjectById(relatedBehaviorProjectId)
    tempUg = immutateUpdate(tempUg, 'druid_datasource_id', () => behaviorProj.datasource_id)
  }

  //一个筛选条件都不选 会给个行为筛选条件用来查用户群
  if (_.isEmpty(tempUg.params.composeInstruction)) {
    tempUg.params.composeInstruction = [{
      config: {
        measure: {
          relation: 'and', // or 'or'
          filters: []
        },
        measure3: {
          relation: 'and', // or 'or'
          filters: []
        },
        dimension: {
          relation: 'and', // or 'or'
          filters: []
        },
        relativeTime: '-7 days',
        since: moment().subtract(7, 'days').format('YYYY-MM-DD hh:mm:ss'),
        until: moment().format('YYYY-MM-DD hh:mm:ss')
      }
    }]
  }
  let query = await p2q(tempUg, false, idx)
  return query
}

const genUsergroupQueryForUindex = async (ug, idx) => {
  // tagFilter to ug
  let tempUg = immutateUpdates(ug,
    'id', () => `${ug.id}_usertag`,
    'params.openWith', () => 'tag-dict',
    `params.composeInstruction[${idx}].config`, (preConfig) => {
      let ugTagFilters = _.get(preConfig, 'tagFilters') || []
      let {relation, tagFilters} = tagFiltersAdaptToOldFormat(ugTagFilters)
      return {
        ...preConfig,
        dimension: {
          filters: toUgFilters(tagFilters),
          relation: relation
        },
        relativeTime: 'custom',
        since: '1000',
        until: '3000',
        measure: {
          relation: 'and',
          filters: [ ]
        },
        measure3: {
          relation: 'and',
          filters: []
        }
      }
    }
  )

  // 使用用户指定的标签项目
  let relatedUserTagProjectId = _.get(ug, 'params.relatedUserTagProjectId')
  if (!isUindexUg(ug) && relatedUserTagProjectId) {
    let userTagProj = await getProjectById(relatedUserTagProjectId)
    tempUg = immutateUpdate(tempUg, 'druid_datasource_id', () => userTagProj.datasource_id)
  }
  let query = await p2q(tempUg, true, idx)
  return query
}

const genUsergroupQueryForUploadedUserGroup = async (ug, idx) => {
  
  let { usergroupFilterStrategy, usergroupFilterTargets } = _.get(ug, `params.composeInstruction[${idx}].config`)
  let dbUg = {}
  if (usergroupFilterStrategy === UsergroupFilterStrategyEnum.byExistingUserGroup) {
    if (_.isEmpty(usergroupFilterTargets)) {
      // 未选择用户群，当做空集（应该在前端阻止保存）
      return getLookupInfo({id: Date.now() + ''})
    }
    dbUg = await db.Segment.findByPk(usergroupFilterTargets[0])
    if (_.isEmpty(dbUg)) {
      dbUg = await db.SegmentVersion.findByPk(usergroupFilterTargets[0])
    }
    return getLookupInfo(dbUg)
  }
  const uploadedUserGroup = _.get(ug, `params.composeInstruction[${idx}].config.uploadedUserGroup`)
  if (uploadedUserGroup) {
    return uploadedUserGroup
  }

  // 没有上传分群，当做空集（应该在前端阻止保存）
  return getLookupInfo({id: Date.now() + ''})
}

export async function generateMultiGroupQuery(dbUg) {
  if (dbUg && dbUg.get) {
    dbUg = dbUg.get({plain: true})
  }

  let composeInstruction = _.get(dbUg, 'params.composeInstruction') || []

  // if (_.isEmpty(composeInstruction)) {
  //   // 兼容旧数据
  //   composeInstruction = [
  //     {
  //       type: !_(dbUg).chain().get('params.tagFilters').isEmpty().value()
  //         ? UserGroupFilterTypeEnum.userTagFilter
  //         : _.get(dbUg, 'params.createMethod') === 'by-upload'
  //           ? UserGroupFilterTypeEnum.userGroupFilter
  //           : UserGroupFilterTypeEnum.behaviorFilter,
  //       op: UserGroupSetOperationEnum.union
  //     }
  //   ]
  // }

  if (_.isEmpty(composeInstruction)) {
    // 按上方逻辑 什么筛选条件都不带 也给个行为条件
    composeInstruction = [
      {
        type: UserGroupFilterTypeEnum.behaviorFilter,
        op: UserGroupSetOperationEnum.union
      }
    ]
  }

  let body = await mapAwaitAll(composeInstruction, async ({type, config, op}, idx) => {
    if (type === UserGroupFilterTypeEnum.behaviorFilter) {
      return {
        type: 'tindex',
        broker: conf.druid.host,
        query: await genUsergroupQueryForTindex(dbUg, idx),
        op
      }
    }
    if (type === UserGroupFilterTypeEnum.userTagFilter) {
      return {
        type: 'uindex',
        broker: conf.uindex.host,
        query: await genUsergroupQueryForUindex(dbUg, idx),
        op
      }
    }
    if (type === UserGroupFilterTypeEnum.userGroupFilter) {
      return {
        type: 'usergroup',
        query: await genUsergroupQueryForUploadedUserGroup(dbUg, idx),
        op
      }
    }
    throw new Error('Unconsider usergroup filter type: ' + type)
  })

  return [...body, {
    type: 'finalGroup',
    query: getLookupInfo(dbUg),
    append: _.get(dbUg, 'params.updateStrategy') === UsergroupUpdateStrategyEnum.append
  }]
}

export function getLookupInfo(dbUg) {
  let md5 = _.get(dbUg, 'params.md5') || (_.startsWith(dbUg.id, 'temp_usergroup_') ? dbUg.id.substr('temp_usergroup_'.length) : null)
  return {
    queryType: 'user_group',
    dataConfig: {
      ...conf.dataConfig,
      groupId: md5 || `usergroup_${dbUg.id}`
    }
  }
}

async function handleUploadUserGroupIds(ugInfoInPostBody) {
  let ug = _.cloneDeep(ugInfoInPostBody)
  const { params } = ug
  let composeInstruction = _.get(params, 'composeInstruction', [])
  let shouldDeleteMd5 = 0, emptyUsergroupIds = 0
  for (let i = composeInstruction.length - 1; i >= 0; i --) {
    let composeItem = composeInstruction[i]
    const { type } = composeItem
    if (type === UserGroupFilterTypeEnum.userGroupFilter) {
      const { config: { usergroupIds, usergroupFilterStrategy } } = composeItem
      // usergroupIds = [] 上传的用户id数组
      if (_.isEmpty(usergroupIds)) {
        emptyUsergroupIds ++
        const { md5 } = _.get(ugInfoInPostBody, 'params') || {}

        if (md5 && usergroupFilterStrategy === UsergroupFilterStrategyEnum.byUpload) {
          //用户群来源上传 但没有找到上传用户时 之前已上传过
          ug = immutateUpdates(ug,
            'params', params => ({
              ..._.omit(params, 'md5')
            }),
            `params.composeInstruction[${i}].config`, config => ({
              uploadedUserGroup: {
                id: md5,
                dataConfig: {
                  ...conf.dataConfig,
                  groupId: md5
                },
                total: config.total   //params.total ?
              }
            })
          )
          continue
        }
        //旧逻辑可以直接删掉返回 但是新逻辑时 此时正在循环中 该逻辑移动到循环外
        // return immutateUpdate(ugInfoInPostBody, 'params', p => _.omit(p, 'md5'))
        shouldDeleteMd5 ++
      } else { 
        // 新用户群，上传用户id，无需创建 lookup，因为这个群只是用作中间计算
        let ugWithIds = ug
        ugWithIds = immutateUpdates(ugWithIds,
          'id', prevId => {
            return _.startsWith(prevId, 'temp_')
              ? prevId // 读入临时分群
              : `${prevId}_uploaded`
          })
        
        let preUploadIdsQuery = p2q2(ugWithIds, usergroupIds)
        let {ids, count} = preUploadIdsQuery
        let dataConfig = {
          ...preUploadIdsQuery.dataConfig,
          ...conf.dataConfig
        }
        let res = await UserGroupService.create(ids, dataConfig)
        if (!res.success) {
          throw new Error('创建分群失败, druid 返回:' + res.status)
        }

        ug = immutateUpdates(ug,
          'params', params => ({
            //TODO md5是什么?
            ..._.omit(params, 'md5')
          }),
          `params.composeInstruction[${i}].config`, composeConfig => ({
            ..._.omit(composeConfig, 'usergroupIds'),
            uploadedUserGroup: {
              id: ugWithIds.id,   //新建时 该id是usergroup_undifined__uploaded
              dataConfig: {
                ...conf.dataConfig,
                groupId: dataConfig.groupId
              },
              total: count
            }
          })
        )
      }
    }
  }
  if (shouldDeleteMd5 === emptyUsergroupIds && shouldDeleteMd5 !== 0) {
    ug = immutateUpdate(ugInfoInPostBody, 'params', p => _.omit(p, 'md5'))
  }
  return ug
}

const addV2 = async (q) => {
  let { usergroup, user_id, company_id, transaction = {} } = q
  //add to db
  let preInsertUg = {
    ...usergroup,
    created_by: user_id,
    company_id,
    compute_time: new Date()
  }

  let sameNameDbUg = await db.Segment.findOne({
    where: {
      company_id,
      title: usergroup.title,
      druid_datasource_id: usergroup.druid_datasource_id
    },
    ...transaction
  })
  if (sameNameDbUg) {
    throw new Error(`保存失败，重复的分群名称【${usergroup.title}】`)
  }

  let dbUg = null
  try {
    //处理用户群筛选条件的逻辑
    preInsertUg = await handleUploadUserGroupIds(preInsertUg)

    dbUg = await db.Segment.create(preInsertUg, transaction)
    // 查询分群，得到人数，缓存到 db 该方法返回用户群计数
    let addToDruidResult = await computeUserGroup(dbUg)
    let rowCount = _.get(addToDruidResult, '[0].event.RowCount')
    if (_.isNil(rowCount)) {
      throw new Error('查询分群失败：' + JSON.stringify(addToDruidResult))
    }
    //新建时没遇到dbUg.tags
    // 标记分群到 lookup，临时用户群（标签计算群）除外
    let addToLookupResult = _.includes(dbUg.tags, UserGroupBuildInTagEnum.UserGroupWithoutLookup)
      ? null
      : await createOrUpdateLookup(getLookupInfo(dbUg), isUindexUg(dbUg))

    let ugWithRowCount = immutateUpdate(dbUg, 'params.total', () => rowCount)
    let updateResult = await db.Segment.update(_.pick(ugWithRowCount, 'params'), {where: { id: dbUg.id }, ...transaction})

    // 加入定时任务
    if (_.get(dbUg, 'params.recomputeStrategy') === UsergroupRecomputeStrategyEnum.byInterval) {
      await initSingleUserGroupRecomputeTask(dbUg)
    }
    return {
      result: dbUg,
      addToDruidResult,
      updateResult,
      addToLookupResult
    }
  } catch (e) {
    err(e.stack)
    if (dbUg) {
      await db.Segment.destroy({
        where: { id: dbUg.id }
      })
    }
    throw e
  }
}

export async function computeUserGroup(ug, preferDirectQuery = '') {
  let serviceUrl = `${pioUserGroupUrl}/ant/usergroup/multi`
  //组装出接口所需参数结构 向serviceUrl发 如果没带第二个参数
  let bodyWithFinalGroup = await generateMultiGroupQuery(ug)

  if (preferDirectQuery && bodyWithFinalGroup.length === 2) {
    let {type, query} = bodyWithFinalGroup[0]
    let func = type === 'uindex'
      ? uindexRequesterWithToArray
      : type === 'tindex'
        ? requesterWithToArray
        : async () => {
          let {total, dataConfig} = _.get(ug, 'params.composeInstruction[0].config.uploadedUserGroup')
          return [{
            version: 'data_row',
            event: {
              RowCount: total,
              groupId: dataConfig.groupId
            }
          }]
        }
    return await func({ query })
  }
  return await Fetch.post(serviceUrl, bodyWithFinalGroup)
}

export function isUindexUg(ug) {
  const openWith = _.get(ug, 'params.openWith')
  return openWith === 'tag-dict' || openWith === 'tag-enhance'
}

const updateV2 = async q => {
  let {query, update} = q

  let originalUg = await db.Segment.findOne({...query, raw: true})
  if (!originalUg) {
    throw new Error('分群不存在或者id不正确')
  }

  let nextUg = {...originalUg, ...update}

  // 用户取消/加入定时设置时需要移除/加入定时任务
  if (isDiffBySomePath(originalUg, nextUg, 'params.recomputeStrategy', 'params.computeIntervalInfo')) {
    await removeSingleUserGroupRecomputeTask(originalUg)
    if (_.get(nextUg, 'params.recomputeStrategy') === UsergroupRecomputeStrategyEnum.byInterval) {
      await initSingleUserGroupRecomputeTask(nextUg)
    }
  }
  // 非临时群改为临时群，移除 lookups
  if (!_.includes(originalUg.tags, UserGroupBuildInTagEnum.UserGroupWithoutLookup)
    && _.includes(nextUg.tags, UserGroupBuildInTagEnum.UserGroupWithoutLookup)) {
    try {
      await removeLookup(getLookupInfo(originalUg).dataConfig, isUindexUg(originalUg))
    } catch (e) {
      console.error(e)
    }
  }

  nextUg = await handleUploadUserGroupIds(nextUg)

  // 同步 datasource_name，防止 datasource_name 变更后查询失败
  let ds = await getDatasourcesById(originalUg.druid_datasource_id)
  if (ds.name !== nextUg.datasource_name) {
    nextUg = immutateUpdate(nextUg, 'datasource_name', () => ds.name)
  }

  let addToDruidResult = await computeUserGroup(nextUg)

  let rowCount = _.get(addToDruidResult, '[0].event.RowCount')
  if (_.isNil(rowCount)) {
    throw new Error('查询分群失败：' + JSON.stringify(addToDruidResult))
  }

  // 标记分群到 lookup，临时用户群（标签计算群）除外
  let addToLookupResult = _.includes(nextUg.tags, UserGroupBuildInTagEnum.UserGroupWithoutLookup)
    ? null
    : await createOrUpdateLookup(getLookupInfo(nextUg), isUindexUg(nextUg))

  nextUg = immutateUpdates(nextUg,
    'params.total', () => rowCount,
    'compute_time', () => new Date())
  let updateResult = await db.Segment.update(nextUg, query)

  if (!nextUg.tags.includes('withMarketing')) return {
    result: updateResult,
    ug: nextUg,
    addToDruidResult,
    lookupResult: addToLookupResult
  }
  
  //生命周期群写入版本表
  let historyUg = immutateUpdates(nextUg, 
    'id', (pre) => `${pre}_${moment().format('YYYYMMDD')}`,
    'segment_id', () => nextUg.id,
    'title', (preTitle) => moment().format('YYYY-MM-DD') + '_' + preTitle,
    'params', (pre) => ({
      ...pre,
      dataConfig: {
        ...conf.dataConfig,
        groupId: `usergroup_${nextUg.id}_${moment().format('YYYYMMDD')}`
      }
    }) 
  )

  let [result, isCreate] = await db.SegmentVersion.findOrCreate({
    where: {
      $and: {
        segment_id: nextUg.id,
        compute_time: {
          $between: [moment().startOf('d').toISOString(), moment().endOf('d').toISOString()]
        }
      }
    },
    defaults: {
      ...historyUg,
      created_at: moment().toISOString()
    },
    raw: true
  })

  if (isCreate) {
    await db.SegmentVersion.update({
      ..._.omit(historyUg,'created_at')
    },{
      where: {
        $and: {
          segment_id: nextUg.id,
          compute_time: {
            $between: [moment().startOf('d').toISOString(), moment().endOf('d').toISOString()]
          }
        }
      }
    })
  }

  let history = await db.SegmentVersion.findOne({
    where: {
      $and: {
        segment_id: nextUg.id,
        compute_time: {
          $between: [moment().startOf('d').toISOString(), moment().endOf('d').toISOString()]
        }
      }
    },
    raw: true
  })

  result = result.dataValues ? result.dataValues : result 
  await computeUserGroup(_.omit(result,'segment_id'))

  // 标记分群到 lookup，临时用户群（标签计算群）除外
  if (!_.includes(history.tags, UserGroupBuildInTagEnum.UserGroupWithoutLookup)) await createOrUpdateLookup(getLookupInfo(history), isUindexUg(history))

  return {
    result: updateResult,
    ug: nextUg,
    addToDruidResult,
    lookupResult: addToLookupResult
  }
}

/**
 * 查询分群列表
 * @param {object} query
 */
const get = async (query) => {
  let id = query.where.id
  let ds = id
    ? await getOne(query)
    : await db.Segment.findAll(query)
  return ds
}

/**
 * 更新分群
 * @param {object} query
 * @param {object} update
 */
const update = async ({
  query,
  update
}) => {
  let ig = await db.Segment.findOne(query)
  if (!ig) throw new Error('分群不存在或者id不正确')

  //add to druid
  let update2 = {
    ..._.pick(ig, ['id', 'datasource_name', 'druid_datasource_id']),
    ...update
  }
  // check datasource_name
  let ds = await db.SugoDatasources.findByPk(ig.druid_datasource_id)
  if (ds.name !== ig.datasource_name) {
    update2.datasource_name = ds.name
  }

  let res
  let addToDruidResult = {}
  let q
  let isUindex
  if (update.params) {
    debug('re compute now')
    isUindex = update.params.openWith === 'tag-dict' || update.params.openWith === 'tag-enhance'
    update.compute_time = new Date()
    if (update.params.createMethod !== 'by-upload') {
      q = await p2q(update2)
      let func = isUindex ? uindexRequesterWithToArray : requesterWithToArray
      addToDruidResult = await func({
        query: q
      })
      update2.params.total = addToDruidResult[0].event.RowCount

    } else {
      q = p2q2(update2)
    }
  }

  res = await db.Segment.update(update2, query)
  let lookupResult = q
    ? await createOrUpdateLookup(q, isUindex)
    : null

  return {
    result: res,
    addToDruidResult,
    lookupResult
  }

}

/**
 * 删除分群
 * @param {object} del
 * @param {object} query
 */
const del = async ({
  del,
  query
}) => {
  let delFromRedisRes, res
  let ug = await db.Segment.findOne(query)
  if (ug) {
    res = await db.Segment.destroy(query)
  } else {
    ug = await db.SegmentVersion.findOne(query)
    if (!ug) throw new Error('分群不存在')
    res = await db.SegmentVersion.destroy(query)
  }
  try {
    if (_.get(ug, 'params.recomputeStrategy') === UsergroupRecomputeStrategyEnum.byInterval) {
      await removeSingleUserGroupRecomputeTask(ug)
    }
    // 如果已经上传过用户群，则先删除原来的 lookup （只会在修改的时候触发）
    const uploadedUserGroup = _.get(ug, 'params.uploadedUserGroup')
    if (uploadedUserGroup) {
      let predelDataConfig = {...uploadedUserGroup.dataConfig, groupId: 'usergroup_' + uploadedUserGroup.id}
      let res = await UserGroupService.del(predelDataConfig)
      // console.log('remove uploaded ug from redis res: ', res)
    }
    delFromRedisRes = _.includes(ug.tags, UserGroupBuildInTagEnum.UserGroupWithoutLookup)
      ? null
      : await removeLookup(del, isUindexUg(ug))
  } catch(e) {
    err(e.stack)
  }

  return {
    result: res,
    delFromRedisRes
  }
}

/**
 * 查询分群数据
 * @param {object} usergroup
 */
const queryV2 = async (usergroup, disableCache) => {
  let { hostAndPorts } = conf.dataConfig
  let { id } = usergroup

  //get from redis first
  let resRedis = !disableCache && await redisGet('config_' + id)
  if (resRedis) {
    return resRedis
  }
  
  usergroup = await handleUploadUserGroupIds(usergroup)

  let addToDruidResult = await computeUserGroup(usergroup, 'preferDirectQuery')

  

  let rowCount = _.get(addToDruidResult, '[0].event.RowCount')
  if (_.isNil(rowCount)) {
    throw new Error('查询分群失败：' + JSON.stringify(addToDruidResult))
  }

  let oneday = 60 * 60 * 24 //oneday
  //save to redis
  await redisSetExpire('config_' + id, oneday, addToDruidResult)

  //set expire usergroup
  await redisExpire(id, oneday, hostAndPorts)

  return addToDruidResult
}

/**
 * 查询分群数据
 * @param {object} usergroup
 */
const query = async usergroup => {
  let { hostAndPorts } = conf.dataConfig
  let { id } = usergroup

  //get from redis first
  let resRedis = await redisGet('config_' + id)
  if (resRedis) {
    return resRedis
  }

  let addToDruidResult
  let isUindex = usergroup.params.openWith === 'tag-dict' || usergroup.params.openWith === 'tag-enhance'
  if (usergroup.params.createMethod === 'by-upload') {
    let query0 = p2q2(usergroup)
    let {
      ids,
      /** @type {DataConfig} */
      //dataConfig,
      count
    } = query0
    let dataConfig = {
      ...query0.dataConfig,
      ...conf.dataConfig
    }
    let res = await UserGroupService.create(ids, dataConfig)
    if (!res.success) throw new Error('创建分群失败', 'druid 返回', res.status)
    addToDruidResult = [{
      version: 'data_row',
      event: {
        RowCount: count,
        groupId: dataConfig.groupId
      }
    }]
  } else {
    let query = await p2q(usergroup, isUindex)
    let func = isUindex ? uindexRequesterWithToArray : requesterWithToArray
    addToDruidResult = await func({
      query
    })
  }

  let oneday = 60 * 60 * 24 //oneday
  //save to redis
  await redisSetExpire('config_' + id, oneday, addToDruidResult)

  //set expire usergroup
  await redisExpire(id, oneday, hostAndPorts)

  return addToDruidResult
}

async function queryLookups(dataSourceId) {
  let proj = dataSourceId && await db.SugoProjects.findOne({ where: { datasource_id: dataSourceId }, raw: true }) || null
  let uIndexLookups, tIndexLookups
  // 只有配置了标签项目才检查uindex对应lookups
  if (proj && (!_.isEmpty(proj.reference_tag_name) || !_.isEmpty(proj.tag_datasource_name))) {
    try {
      uIndexLookups = await Fetch.get(`${uindexLookupUrl}/druid/coordinator/v1/lookups/__default`)
    } catch (e) {
      console.log(e.message, e.stack)
    }
  }
  try {
    tIndexLookups = await Fetch.get(`${druidLookupUrl}/druid/coordinator/v1/lookups/__default`)
  } catch (e) {
    console.log(e.message, e.stack)
  }
  return {
    tIndexLookups: tIndexLookups || [],
    uIndexLookups: uIndexLookups || []
  }
}

async function queryLookupListenerDict() {
  let uIndexLookupListenerDict, tIndexLookupListenerDict
  try {
    uIndexLookupListenerDict = await Fetch.get(`${uindexLookupListenUrl}/druid/listen/v1/lookups/`)
  } catch (e) {
    console.log(e.message, e.stack)
  }
  try {
    tIndexLookupListenerDict = await Fetch.get(`${druidLookupListenUrl}/druid/listen/v1/lookups/`)
  } catch (e) {
    console.log(e.message, e.stack)
  }
  return {
    tIndexLookupListenerDict: tIndexLookupListenerDict || {},
    uIndexLookupListenerDict: uIndexLookupListenerDict || {}
  }
}

async function getUserIdsByTempId(id, limit, offset) {
  let q = {
    groupReadConfig: {
      pageIndex: 0,
      pageSize: 1000000
    },
    dataConfig: {
      ...conf.dataConfig,
      groupId: id
    }
  }
  let res = await UserGroupService.read(q)
  let usergroupIds = _.get(res, 'result.ids') || []
  usergroupIds = _.slice(usergroupIds, offset, limit + offset )
  return usergroupIds
}

function getJobKey(id) {
  return `usergroup-recompure-${id}`
}

export async function doRecompute(ugId) {
  let originalUg = await db.Segment.findOne({
    where: { id: ugId },
    raw: true
  })
  if (!originalUg) {
    return
  }

  // 同步 datasource_name，防止 datasource_name 变更后查询失败
  let ds = await getDatasourcesById(originalUg.druid_datasource_id)
  if (ds.name !== originalUg.datasource_name) {
    originalUg = immutateUpdate(originalUg, 'datasource_name', () => ds.name)
  }

  let addToDruidResult = await computeUserGroup(originalUg)

  let rowCount = _.get(addToDruidResult, '[0].event.RowCount')
  if (_.isNil(rowCount)) {
    console.error('查询分群失败：' + JSON.stringify(addToDruidResult))
    return
  }

  // 标记分群到 lookup，临时用户群（标签计算群）除外
  if (!_.includes(originalUg.tags, UserGroupBuildInTagEnum.UserGroupWithoutLookup)) {
    await createOrUpdateLookup(getLookupInfo(originalUg), isUindexUg(originalUg))
  }

  let nextUg = immutateUpdates(originalUg,
    'params.total', () => rowCount,
    'compute_time', () => new Date())

  await db.Segment.update(nextUg, { where: {id: nextUg.id} })
  
  let historyUg = immutateUpdates(_.omit(nextUg, 'id'), 
    'segment_id', () => nextUg.id,
    'title', (preTitle) => moment().format('YYYY-MM-DD') + '_' + preTitle 
  )

  let [result] = await db.SegmentVersion.findOrCreate({
    where: {
      segment_id: nextUg.id,
      compute_time: {
        $between: [moment().startOf('d').format('YYYY-MM-DD HH:mm:ss'), moment().endOf('d').format('YYYY-MM-DD HH:mm:ss')]
      }
    },
    defaults: {
      ...historyUg
    }
  })
  
  if (result) {
    await db.SegmentVersion.update({ historyUg }, {
      where: {
        $and: {
          segment_id: nextUg.id,
          compute_time: {
            $between: [moment().startOf('d').format('YYYY-MM-DD HH:mm:ss'), moment().endOf('d').format('YYYY-MM-DD HH:mm:ss')]
          }
        }
      }
    })
  }

  console.log(`auto recompute usergroup ${originalUg.title} success, user count from `, _.get(originalUg, 'params.total'), ' change to ', rowCount)
}

async function initSingleUserGroupRecomputeTask(dbUg) {
  let cronExpression = _.get(dbUg, 'params.computeIntervalInfo.cronExpression')
  if (!cronExpression) {
    console.warn(`Usergroup ${dbUg.title} has no cronExpression`)
    return
  }
  log('add dbUg recompute task => ', dbUg.title || dbUg.id)
  // cron:
  // 0 */n * * * * // 每隔n分钟
  // 0 0 */ * * *  // 每隔n小时
  try {
    await RedisSchedule.getInstance().addJob(getJobKey(dbUg.id), {
      // every: '20 seconds',
      cron: `${cronExpression}`,
      path: './segment.service',
      func: 'doRecompute',
      data: dbUg.id,
      counter: 0
    })
  } catch (e) {
    console.error(e)
  }
}

async function removeSingleUserGroupRecomputeTask(dbUg) {
  try {
    await RedisSchedule.getInstance().cancelJob(getJobKey(dbUg.id))
  } catch (e) {
    console.error(e)
  }
}

export async function initAutoUpdateUserGroupTask() {
  // PM2 cluster模式只启动一次定时任务
  const clusterId = process.env.NODE_APP_INSTANCE || 0
  if (+clusterId !== 0) {
    return
  }

  // 只有 params.recomputeStrategy === UsergroupRecomputeStrategyEnum.byInterval 才加入定时任务
  // 用户取消该设置/删除分群时需要移除定时任务
  let preAddTaskUgs = await db.Segment.findAll({
    where: {
      'params.recomputeStrategy': UsergroupRecomputeStrategyEnum.byInterval
    },
    order: [['druid_datasource_id', 'asc']],
    raw: true
  })
  
  let dsArr = await getDataSourcesByIds(preAddTaskUgs.map(dbUg => dbUg.druid_datasource_id))
  let dsIdDict = _.keyBy(dsArr, 'id')
  for (let dbUg of preAddTaskUgs.filter(dbUg => dsIdDict[dbUg.druid_datasource_id])) {
    let ds = dsIdDict[dbUg.druid_datasource_id]
    dbUg = immutateUpdate(dbUg, 'title', prev => `(${ds.title || ds.name})${prev}`)
    await initSingleUserGroupRecomputeTask(dbUg)
  }
}

export default {
  get,
  update: updateV2,
  del,
  query: queryV2,
  add: addV2,
  queryLookups,
  queryLookupListenerDict,
  getUserIdsByTempId,
  getInstance: () => ({doRecompute: jobInfo => doRecompute(jobInfo.data)}) // 定时执行需要用到
}
