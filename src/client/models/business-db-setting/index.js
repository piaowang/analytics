import { action as Action, actions as Actions } from './actions'
import Resource from './resource'

/**
 * @typedef {Object} SugoBusinessDbModel
 *
 * @property {String} id
 * @property {String} db_name - 数据名称
 * @property {String} db_type - 数据库类型
 * @property {String} db_jdbc: - 预留字段
 * @property {String} table_name - 表名称
 * @property {String} db_user - 数据库用户名
 * @property {String} db_pwd - 密码
 * @property {String} db_key - 要关联的key
 * @property {String} dimension - 对应维度
 * @property {String} company_id - 企业id
 * @property {String} created_by - 创建人
 * @property {String} updated_by - 最后一次更新人
 * @property {String} created_at - 创建时间
 * @property {String} updated_at - 最后一次更新时间
 *
 * @property {?String} message
 */

/** @type {SugoBusinessDbModel} */
const Def = {
  id: '',
  table_title: '',
  db_type: 'mysql',
  db_jdbc: '',
  table_name: '',
  db_user: null,
  db_pwd: null,
  db_key: '',
  dimension: '',
  state: '1',
  company_id: '',
  created_by: '',
  updated_by: '',
  created_at: '',
  updated_at: '',
  project_id: '',
  encrypted: true,
  message: null
}

/**
 * @param {SugoBusinessDbModel} state
 * @param {object} action
 * @param {function} done
 * @return {*}
 */
function scheduler(state, action, done) {
  switch (action.type) {
    case Action.create:
      return Actions.create(state, action.payload.project_id, action.payload.isUindex, done)
    case Action.update:
      return Actions.update(state, done)
    case Action.del:
      return Actions.del(state, done)
    case Action.test:
      return Actions.test(state, done)
    case Action.change:
      return {
        ...state,
        ...action.payload
      }
    case Action.default:
      return Def
    default:
      return state
  }
}

export default {
  name: 'BusinessDbSetting',
  state: { ...Def },
  scheduler
}

export {
  Action,
  Resource,
  Def
}
