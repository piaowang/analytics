import {log} from '../utils/log'
import {rawQueryWithTransaction} from '../utils/db-utils'
import {UserGroupBuildInTagEnum} from 'common/constants'
import _ from 'lodash'
import {immutateUpdate} from 'common/sugo-utils'
import {generateMultiGroupQuery} from '../services/segment.service'
import Fetch from '../utils/fetch-kit'
import conf from '../config'
import {UsergroupFilterStrategyEnum, UserGroupFilterTypeEnum, UserGroupSetOperationEnum} from '../../common/constants'

async function backupUploadedUserGroup(ug) {
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

  let rowCount = _.get(addToDruidResult, '[0].event.RowCount')
  if (_.isNil(rowCount)) {
    throw new Error('查询分群失败：' + JSON.stringify(addToDruidResult))
  }

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
  // 1. 分群允许按标签区分
  // 旧的标签，如果是从行为事件分析创建的，则标记为 UserGroupBuildInTagEnum.AnalyticResultAsUserGroup
  // 如果是从漏斗或留存的下钻创建的，则标记为 UserGroupBuildInTagEnum.UserActionInspectResultAsUserGroup
  // 如果是从用户标签筛选创建的，则标记为 UserGroupBuildInTagEnum.UserTagFilteredResultAsUserGroup
  // 2. 标签分群的筛选类型，从 dimension 转移保存到 tagFilters，并清空 dimension 筛选
  // 3. 通过上传创建的用户群，dataConfig 信息另存到另外一个属性： uploadedUserGroup: { id?, dataConfig, total }
  const version = '0.19.5'

  const arr = [
    'ALTER TABLE public.segment ADD tags jsonb DEFAULT \'[]\' NULL;'
  ]
  await db.client.transaction(async t => {

    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    let dbUgs = await db.Segment.findAll({transaction: t})

    for (let ug of dbUgs) {
      let {title, params} = ug
      let {openWith, backToRefererTitle, createMethod, tagFilters, composeInstruction} = params || {}

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
          ug.params = await backupUploadedUserGroup(ug)
        }

        await ug.save({transaction: t})
      } catch (e) {
        console.error(e)
        continue
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
