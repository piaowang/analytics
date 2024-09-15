/**
 * @Author sugo.io<asd>
 * @Date 17-9-26
 * @desc 用户分群 Collection
 * @see {SegmentModel}
 */

import { Resource } from '../../../../models/segment'
import { Action as MsgAction } from './message'
import _ from 'lodash'
import {tagFiltersAdaptToOldFormat} from '../../../../../common/param-transform'
import {immutateUpdates} from '../../../../../common/sugo-utils'
import {
  UserGroupBuildInTagEnum,
  UserGroupFilterTypeEnum,
  UserGroupSetOperationEnum
} from '../../../../../common/constants'

/**
 * @param {string} mark
 * @return {string}
 */
function creator (mark) {
  return `collection-segment-${mark}`
}

/**
 * @typedef {Object} SegmentCollectionState
 * @property {Array<SegmentModel>} list
 */

const Action = {
  reset: creator('reset'),
  add: creator('add'),
  update: creator('update'),
  remove: creator('remove'),
  sync: creator('sync'),
  fetch: creator('fetch')
}

const Actions = {
  /**
   * 初始化时请求项目的所有标签分群
   * @param {string} dataSourceId
   * @param {Collection} col
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async fetch(dataSourceId, col, done){
    const res = await Resource.list(dataSourceId)
    col.reset(res.result)
    done()
  },

  /**
   * 同步分群到服务器
   * @param {Store} store
   * @param {string} primaryKey
   * @param {Collection} col
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async sync(store, primaryKey, col, done){
    // 此处只需要创建新的分群，其他不管
    // 所以只需要查看json.toCreate是否有primaryKey的记录即可
    const json = col.toJSON()
    const to_create = json.toCreate
    let segment = to_create.find(r => r.id === primaryKey)
    if (!segment) {
      // TODO 说明该collection里并没有该分群，作为异常处理
      return done({})
    }
    // TODO 调用服务器接口保存
    // 设置分群分组
    segment = immutateUpdates(segment,
      'tags', () => [UserGroupBuildInTagEnum.UserTagFilteredResultAsUserGroup]
    )
    // return
    const { result, success, message } = await Resource.create(segment)

    // 如果返回失败，则需要处理错误消息
    if (!success) {
      done()
      return store.dispatch({
        type: MsgAction.change,
        payload: { error: message }
      })
    } else {
      let ugTagFilters = _.get(result, 'params.composeInstruction[0].config.tagFilters') || []
      let {relation} = tagFiltersAdaptToOldFormat(ugTagFilters)
      store.dispatch({
        type: MsgAction.change,
        payload: {
          duration: 8,
          info: (
            <span>
              保存成功。<a href={`/console/tag-users?ugId=${result.id}&relation=${relation}`}>查看分群</a>
            </span>
          )
        }
      })
    }

    col.update(result.id, result)
    done()
  }
}

/**
 * @param {Object} action
 * @param {Collection<SegmentModel>} collect
 * @param {Function} done
 * @this {Store}
 */
function scheduler (action, collect, done) {
  const { type, payload } = action

  switch (type) {

    case Action.fetch:
      Actions.fetch(payload, collect, done)
      break

    case Action.reset:
      collect.reset(payload)
      done()
      break

    case Action.add:
      if (collect.find({id: payload.id})) {
        collect.update(payload.id, payload)
      } else {
        collect.add(payload)
      }
      done()
      break

    case Action.update:
      collect.update(payload.primaryKey, payload.props)
      done()
      break

    case Action.sync:
      Actions.sync(this, payload, collect, done)
      break

    default:
      done()
  }
}

export default {
  name: 'SegmentCollection',
  primaryKey: 'id',
  scheduler
}

export {
  Action
}
