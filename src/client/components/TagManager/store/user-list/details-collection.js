/**
 * @Author sugo.io<asd>
 * @Date 17-9-26
 * @desc 标签详细 Collection
 * @see {TagDetailsModel}
 */

import Resources from '../../../../models/segment/resources'
import { Action as MsgAction } from './message'

/**
 * TODO Mock数据，待接口出来后添加映射函数到该结构
 * @typedef {Object} TagDetailsModel
 * @property {string} member_uuid       - 用户唯一标识
 * @property {Array<Object>} values          - 字段值
 */

/**
 * @typedef {Object} TagDetailsCollectionState
 * @property {Array<TagDetailsModel>} list
 * @property {string} member_uuid
 * @property {number} total
 */

/**
 * @param {string} mark
 * @return {string}
 */
function creator (mark) {
  return `collection-tag-details-${mark}`
}

const Action = {
  fetch: creator('fetch'),
  reset: creator('reset'),
  add: creator('add'),
  remove: creator('remove'),
  query_member: creator('query-member')
}

const Actions = {

  /**
   * 请示某个分群下的用户详细信息列表
   * @param {Store} store
   * @param {{project_id:string,datasource_name:string,page:number,page_size:number,filter:*}} params
   * @param {Collection<TagDetailsModel>} col
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async query(store, params, col, done){
    const { dimensions } = store.state.VM

    const { result, success, message } = await Resources.tagSegmentList(params, dimensions)

    if (!success) {
      done()
      return store.dispatch({
        type: MsgAction.change,
        payload: { error: message }
      })
    }
    const { list, member_uuid, total, tags } = result

    // 无论返回数据是何种格式，将其转为如下格式
    // 其中member_uuid为用户唯一标识
    // values为其他字段值的数组
    col.reset(list.map(r => ({
      member_uuid: r[member_uuid],
      values: r
    })))

    done({ total, tags })
  },

  /**
   * 请示某个分群下的用户详细信息列表
   * @param {Store} store
   * @param {{project_id:string,datasource_name:string,page:number,page_size:number}} params
   * @param {Collection<TagDetailsModel>} col
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async fetch(store, params, col, done){
    await this.query(store, params, col, done)
  },

  /**
   * 模糊查询member_uuid的用户
   * @param {Store} store
   * @param {{datasource_name:string,page:number,page_size:number,member_uuid:string}} params
   * @param {Collection<TagDetailsModel>} col
   * @param {Function} done
   * @return {Promise.<void>}
   */
  async member(store, params, col, done){
    await this.query(store, params, col, done)
  }
}

/**
 * @param {Object} action
 * @param {Collection} collect
 * @param {Function} done
 * @this {Store}
 */
function scheduler (action, collect, done) {
  const { type, payload } = action

  switch (type) {

    case Action.fetch:
      Actions.fetch(this, payload, collect, done)
      break

    case Action.query_member:
      Actions.member(this, payload, collect, done)
      break

    case Action.reset:
      collect.reset(payload.models)
      done()
      break

    case Action.add:
      collect.add(payload.models)
      done()
      break

    default:
      done()
  }
}

export default {
  name: 'TagDetailsCollection',
  primaryKey: 'member_uuid',
  scheduler
}

export {
  Action
}
