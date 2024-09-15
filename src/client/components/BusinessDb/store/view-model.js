import BusinessResource from '../../../models/business-db-setting/resource'
import DimensionResource from '../../../models/dimension/resource'
import _ from 'lodash'
import { BUSINESS_SETTING_MESSAGE_TYPE as messageType } from '../../../models/business-db-setting/constants'

const Action = {
  testingConnection: 'business-db-setting-testing',
  list: 'business-db-setting-list',
  dimensionList: 'business-db-setting-dimensions',
  updateState: 'business-db-setting-updatestate',
  change: 'business-db-setting-change'
}

/**
 * @typedef {Object} ViewModel
 * @property {Number} type - 接入类型
 * @property {Array<BusinessDbsetting>} settingList
 */

const Def = {
  modalVisible: false,
  testOk: false,
  serach: '',
  settingList: [],
  fields: [],
  dimensions: [],
  messages: {
    type: '',
    content: ''
  }
}

const Actions = {
  /**
 * 获取项目维度
 * @param {String} datasource_id
 * @param {Function} done
 */
  async dimensionList(datasource_id, done) {
    const res = await DimensionResource.list(datasource_id)
    done({ dimensions: res.success ? res.result || [] : [] })
  },

  /**
 * 查询列表
 * @param {String} company_id
 * @param {Function} done
 */
  async list(company_id, done) {
    const res = await BusinessResource.list(company_id)
    done({ settingList: res.success ? res.result || [] : [] })
  },

  /**
   * 测试连接
   * 
   * @param {any} store 
   * @param {any} done
   */
  async testingConnection(payload, store, done) {
    const res = await BusinessResource.test({ ...store, ...payload })
    if (res.success) {
      done({ fields: res.result, testOk: true })
    } else {
      done({ fields: [], testOk: false, messages: { type: messageType.error, content: '连接失败' } })
    }
  },

  /**
   * 修改状态
   * @param {String} companyid
   * @param {Function} done
   */
  async updateState(id, status, dataSourceId, state, done) {
    const ret = await BusinessResource.updateState(id, status, dataSourceId)
    if (ret.success) {
      let list = state.settingList
      let ind = _.findIndex(list, p => p.id === id)
      list[ind].state = status
      done({ settingList: list })
    } else {
      done({ messages: { type: messageType.error, content: '修改失败' } })
    }
  }
}

/**
 * @param {ViewModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {Object}
 */
function scheduler(state, action, done) {
  switch (action.type) {
    case Action.list:
      return Actions.list(action.payload, done)
    case Action.change:
      return { ...state, ...action.payload }
    case Action.testingConnection:
      return Actions.testingConnection(action.payload, this.store.state.BusinessDbSetting, done)
    case Action.dimensionList:
      return Actions.dimensionList(action.payload.datasource_id, done)
    case Action.updateState:
      return Actions.updateState(action.payload.id, action.payload.status, action.payload.dataSourceId, state, done)
    default:
      return state
  }
}

export default {
  name: 'vm',
  scheduler,
  state: { ...Def }
}

export {
  Action
}
