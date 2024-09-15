import { log } from '../utils/log'
import { UserGroupFilterTypeEnum, UsergroupFilterStrategyEnum, UserGroupSetOperationEnum, UsergroupUpdateStrategyEnum } from '../../common/constants'
import {UserGroupBuildInTagEnum} from 'common/constants'
import conf from '../config'
import Fetch from '../utils/fetch-kit'
import {immutateUpdate} from 'common/sugo-utils'
import { getLookupInfo } from '../services/segment.service'
import _ from 'lodash'
import {mapAwaitAll} from '../../common/sugo-utils'
import { checkColumnExists, rawQueryWithTransaction, addColumn } from '../utils/db-utils'


async function genUsergroupQueryForUploadedUserGroup(ug, db) {
  let {usergroupFilterStrategy, usergroupFilterTargets, createMethod} = _.get(ug, 'params')
  if (usergroupFilterStrategy === UsergroupFilterStrategyEnum.byExistingUserGroup) {
    if (_.isEmpty(usergroupFilterTargets)) {
      // 未选择用户群，当做空集（应该在前端阻止保存）
      return getLookupInfo({id: Date.now() + ''})
    }
    let dbUg = await db.Segment.findById(usergroupFilterTargets[0])
    return getLookupInfo(dbUg)
  }
  const uploadedUserGroup = _.get(ug, 'params.uploadedUserGroup')
  if (uploadedUserGroup) {
    return uploadedUserGroup
  }
  if (createMethod === 'by-upload') {
    // 只有数据库升级的时候才会进入这里
    return getLookupInfo(ug)
  }
  // 没有上传分群，当做空集（应该在前端阻止保存）
  return getLookupInfo({id: Date.now() + ''})
}

async function generateMultiGroupQuery(dbUg, db) {
  let composeInstruction = _.get(dbUg, 'params.composeInstruction') || []

  if (_.isEmpty(composeInstruction)) {
    // 兼容旧数据
    composeInstruction = [
      {
        type: UserGroupFilterTypeEnum.behaviorFilter,
        op: UserGroupSetOperationEnum.union
      }
    ]
  }

  let body = await mapAwaitAll(composeInstruction, async ({type, config, op}, idx) => {
    if (type === UserGroupFilterTypeEnum.userGroupFilter) {
      return {
        type: 'usergroup',
        query: await genUsergroupQueryForUploadedUserGroup(dbUg, db),
        op
      }
    }
    throw new Error('Unconsider usergroup filter type: ' + type)
  })

  body = body.filter(_.identity)

  return [...body, {
    type: 'finalGroup',
    query: getLookupInfo(dbUg),
    append: _.get(dbUg, 'params.updateStrategy') === UsergroupUpdateStrategyEnum.append
  }]
}

async function backupUploadedUserGroup(ug, db) {
  let {params} = ug
  if (!_.isEmpty(params.uploadedUserGroup)) {
    return params
  }
  let serviceUrl = `${conf.pioUrl}/ant/usergroup/multi`
  let bodyWithFinalGroup = await generateMultiGroupQuery(ug.get({plain: true}))
  bodyWithFinalGroup = bodyWithFinalGroup.map(ugq => {
    return ugq.type === 'finalGroup'
      ? immutateUpdate(ugq, 'query.dataConfig.groupId', prevGroupId => `${prevGroupId}_uploaded`)
      : ugq
  })
  let addToDruidResult = await Fetch.post(serviceUrl, bodyWithFinalGroup)

  let rowCount = _.get(addToDruidResult, '[0].event.RowCount', 0)
  // if (_.isNil(rowCount)) {
  //   throw new Error('查询分群失败：' + JSON.stringify(addToDruidResult))
  // }

  return {
    ..._.omit(params, 'createMethod'),
    uploadedUserGroup: {
      id: `${ug.id}_uploaded`,
      dataConfig: params.dataConfig, // groupId: usergroup_{ug.id}_uploaded
      total: rowCount
    }
  }
}

export default async db => {

  const version = '0.19.32'

  await db.client.transaction( async t => {

    const transaction = { transaction: t }

    await addColumn(db, transaction, 'sugo_life_cycles', 'status', {
      type: db.Sequelize.JSON,
      defaultValue: {}
    })

    //0.19.5逻辑
    let dbUgs = await db.Segment.findAll({transaction: t})
    for (let ug of dbUgs) {
      let {title, params} = ug
      let {openWith, backToRefererTitle, createMethod, tagFilters, composeInstruction} = params || {}

      let tempUgTags = ug.tags
      try {
        if (openWith === 'tag-dict' || openWith === 'tag-manager') {
          ug.tags = [UserGroupBuildInTagEnum.UserTagFilteredResultAsUserGroup]
          // 之前标签保存用户群会将 tagFilters 转换保存到 params.dimension，现在会跟行为筛选冲突，所以这个步骤去掉，后端直接根据 tagFilters 生成 druid 查询
          let relation = _.get(params, 'dimension.relation') || 'and'
          if (relation === 'or' && !_.isEmpty(tagFilters)) {
            // tagFilters 套一层 or
            ug.params = immutateUpdate(ug.params, 'tagFilters', prev => [{op: 'or', eq: prev}])
          }
          ug.params = immutateUpdate(ug.params, 'dimension', () => ({ relation: 'and', filters: [] } ))
        } else if (backToRefererTitle === '查看关联单图') {
          ug.tags = [UserGroupBuildInTagEnum.AnalyticResultAsUserGroup]
        } else if (_.includes(title, '流失分析') || _.includes(title, '漏斗分析') || _.includes(title, '留存分析')
          || _.includes(title, '回访') || _.includes(backToRefererTitle, '路径分析')) {
          ug.tags = [UserGroupBuildInTagEnum.UserActionInspectResultAsUserGroup]
        }

        // set default composeInstruction
        if (_.isEmpty(composeInstruction)) {
          ug.params = immutateUpdate(ug.params, 'composeInstruction', () => [{
            type: !_.isEmpty(tagFilters)
              ? UserGroupFilterTypeEnum.userTagFilter
              : createMethod === 'by-upload'
                ? UserGroupFilterTypeEnum.userGroupFilter
                : UserGroupFilterTypeEnum.behaviorFilter,
            op: UserGroupSetOperationEnum.union
          }])
        }

        if (createMethod === 'by-upload') {
          ug.params = {
            ...ug.params,
            usergroupFilterStrategy: UsergroupFilterStrategyEnum.byUpload
          }
          // 需要新计算一个新用户群，id 后缀添加 _uploaded，保存到 uploadedUserGroup
          ug.params = await backupUploadedUserGroup(ug, db)
        }

        ug.tags = tempUgTags
        await ug.save({transaction: t})
      } catch (e) {
        console.error(e)
        continue
      }
    }

    //0.19.21逻辑
    let allSegment = await db.Segment.findAll({transaction: t})
  
    for (let i = allSegment.length - 1; i >= 0; i --) {
      const { params: p } = allSegment[i]
      let params = _.cloneDeep(p)
      let newComposeInstruction = []
      const oldComposeInstruction = _.get(p,'composeInstruction', [])
      const { 
        //行为筛选条件
        measure,
        measure3,
        dimension,
        since,
        until,
        relativeTime,
        //标签筛选条件
        tagFilters,
        //用户分群筛选条件
        usergroupFilterTargets = [],
        usergroupFilterStrategy,
        createMethod,
        uploadedUserGroup = []
      } = p
  
      if (_.isEmpty(oldComposeInstruction)) {
        if (!_.isEmpty(tagFilters)) {
          newComposeInstruction.push({
            type: UserGroupFilterTypeEnum.userTagFilter,
            op: UserGroupSetOperationEnum.union,
            config: {
              tagFilters
            }
          })
        } else if (createMethod === 'by-upload') {
          newComposeInstruction.push({
            type: UserGroupFilterTypeEnum.userGroupFilter,
            op: UserGroupSetOperationEnum.union,
            config: {
              usergroupFilterTargets,
              uploadedUserGroup,
              usergroupFilterStrategy: UsergroupFilterStrategyEnum.byUpload
            }
          })
        } else {
          newComposeInstruction.push({
            type: UserGroupFilterTypeEnum.behaviorFilter,
            op: UserGroupSetOperationEnum.union,
            config: {
              measure,
              measure3,
              dimension,
              since,
              until,
              relativeTime
            }
          })
        }
      }
  
      for (let j = oldComposeInstruction.length - 1; j >= 0; j --) {
        const { type, op } = oldComposeInstruction[j]
        switch (type) {
          case UserGroupFilterTypeEnum.behaviorFilter:
            newComposeInstruction.push({
              type: UserGroupFilterTypeEnum.behaviorFilter,
              op,
              config: {
                measure,
                measure3,
                dimension,
                since,
                until,
                relativeTime
              }
            })
            break
          case UserGroupFilterTypeEnum.userTagFilter:
            newComposeInstruction.push({
              type: UserGroupFilterTypeEnum.userTagFilter,
              op,
              config: {
                tagFilters
              }
            })
            break
          case UserGroupFilterTypeEnum.userGroupFilter:
            newComposeInstruction.push({
              type: UserGroupFilterTypeEnum.userGroupFilter,
              op,
              config: {
                usergroupFilterTargets,
                uploadedUserGroup,
                usergroupFilterStrategy
              }
            })
            break
        }
      }
  
      params.composeInstruction = newComposeInstruction
      //旧有筛选条件在此处为扁平结构 该脚本将下列属性折叠到composeInstruction.config中
      params = _.omit(params, [
        //行为筛选条件
        'measure',
        'measure3',
        'dimension',
        'since',
        'until',
        'relativeTime',
        //标签筛选条件
        'tagFilters',
        //用户分群筛选条件
        'usergroupFilterTargets',
        'usergroupFilterStrategy',
        'uploadedUserGroup'
      ])

      allSegment[i].params = params
      try {
        await allSegment[i].save({transaction: t})
      } catch (e) {
        throw Error(e)
      }

    }

    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)

    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      ...transaction
    })

    log(`update ${version} done`)
  })
}
