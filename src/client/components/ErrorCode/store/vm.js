/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

import Actions, { Action } from './vm-actions'

/**
 * @typedef {Object} LogCodeLogCodeViewModel
 *
 * @property {Object} project
 * @property {Array<LogCodeSystemCodeModel>} systems
 * @property {Array<LogCodeModuleCode>} modules
 * @property {Array<LogCodeInterfaceCodeModel>} interfaces
 * @property {Array<LogCodeLogCodeModel>} codes
 * 
 * @property {{count:number,pageSize:number,currentPage:number}} pagination
 *
 * @property {boolean} visibleSystemModal
 * @property {boolean} visibleModuleModal
 * @property {boolean} visibleInterfaceModal
 * @property {boolean} visibleLogCodeModal
 * @property {boolean} searching
 *
 * @property {object} storage
 * @property {LogCodeFilter} filter
 *
 * @property {?string} tips
 * @property {?ReadCsvAsUint8} reader  - 读取文件的reader
 * @property {?File} file
 * @property {number} progress        - 上传进度
 * @property {number} uploaded         - 上传成功条数
 * @property {number} uploadFaild      - 失败条数
 */

/**
 * @typedef {object} LogCodeFilter
 * @property {?string} system_id
 * @property {?string} module_id
 * @property {?string} interface_id
 * @property {?string} keyword
 */

/**
 * @type {LogCodeLogCodeViewModel}
 */
const Def = {
  // modules
  project: {},
  systems: [],
  modules: [],
  interfaces: [],
  codes: [],

  pagination: {
    count: 0,
    pageSize: 10,
    currentPage: 1
  },

  // state
  visibleSystemModal: false,
  visibleModuleModal: false,
  visibleInterfaceModal: false,
  visibleLogCodeModal: false,
  searching: false,
  pause: false,

  // storage
  storage: {},

  // filter
  filter: {
    system_id: null,
    module_id: null,
    interface_id: null,
    keyword: null
  },

  tips: null,
  file: null,
  reader: null,
  progress: null,
  uploaded: 0,
  uploadFaild: 0
}

/**
 * @param {LogCodeLogCodeViewModel} state
 * @param {{type:string,payload:*}} action
 * @param {function} next
 * @this {ViewModel}
 */
function scheduler(state, action, next) {
  const { type, payload } = action

  switch (type) {
    case Action.INIT:
      Actions.init(this.store, payload.project, state, next)
      break

    case Action.UPDATE:
      Actions.update(payload, state, next)
      break

    case Action.UPDATE_STORAGE:
      next({
        storage: {
          ...state.storage,
          ...payload
        }
      })
      break

    case Action.UPDATE_FILTER:
      Actions.doFilter(payload, state, next)
      break

    case Action.PAGE_CHANGE:
      Actions.pageChange(this.store, payload.currentPage, payload.pageSize, state, next)
      break

    case Action.CREATE_FROM_FILE:
      Actions.createFormFile(this.store, state, payload, next)
      break
    case Action.PAUSE:
      Actions.pause(state, next)
      break

    case Action.RESUME:
      Actions.resume(state, next)
      break

    case Action.SAMPLE_FILE:
      Actions.sampleFile(state, next)
      break

    default:
      return { tips: null }
  }
}

export default {
  name: 'vm',
  state: { ...Def },
  scheduler
}

export {
  Action
}
