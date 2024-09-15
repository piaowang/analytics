/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

import { Store, storeValidatorCreator, storeViewModelCreator } from 'sugo-store'
import systemCode, { Action as SystemAction } from '../../../models/system-code'
import moduleCode, { Action as ModuleAction } from '../../../models/module-code'
import interfaceCode, { Action as InterfaceAction } from '../../../models/interface-code'
import logCode, { Action as LogCodeAction } from '../../../models/log-code'
import VM, { Action as VMAction } from './vm'

/**
 * @param {String} type
 * @param {*} [payload]
 * @return {{type: *, payload: *}}
 */
function struct(type, payload) {
  return { type, payload }
}

/**
 * @typedef {Object} LogCodeLogCodeViewState
 * @property {LogCodeInterfaceCode} InterfaceCode
 * @property {LogCodeLogCode} LogCode
 * @property {LogCodeModuleCode} ModuleCode
 * @property {LogCodeSystemCode} SystemCode
 * @property {ChinaLogCodeLogCodeViewModel} vm
 */

export default class Storage extends Store {
  constructor() {
    super()
    storeValidatorCreator(systemCode(), this)
    storeValidatorCreator(moduleCode(), this)
    storeValidatorCreator(interfaceCode(), this)
    storeValidatorCreator(logCode(), this)
    storeViewModelCreator([VM], this)
  }

  /**
   * @param {object|Array<object>} actionOrActions
   * @return {Promise<*>}
   */
  async dispatchAsync(actionOrActions) {
    return new Promise(resolve => this.dispatch(actionOrActions, resolve))
  }

  /**
   * @param {object} project
   * @return {Storage}
   */
  init(project) {
    this.initialize()
    this.dispatch(struct(VMAction.INIT, { project }))
    return this
  }

  /**
   * @param {boolean} visible
   * @return {Store<T>}
   */
  openSystemModal(visible) {
    return this.dispatch([
      struct(VMAction.UPDATE, { visibleSystemModal: visible }),
      struct(SystemAction.RESET, {
        project_id: this.state.vm.project.id
      })
    ])
  }

  /**
   * @param {boolean} visible
   * @return {Store<T>}
   */
  openModuleModal(visible) {
    return this.dispatch([
      struct(VMAction.UPDATE, { visibleModuleModal: visible }),
      struct(ModuleAction.RESET, {})
    ])
  }

  /**
   * @param {boolean} visible
   * @return {Store<T>}
   */
  openInterfaceModal(visible) {
    this.dispatch(struct(VMAction.UPDATE, { visibleInterfaceModal: visible }))
  }

  /**
   * @param {boolean} visible
   * @return {Store<T>}
   */
  openLogCodeModal(visible) {
    this.dispatch(struct(VMAction.UPDATE, { visibleLogCodeModal: visible }))
  }

  /**
   * @param {object} props
   * @return {Store<T>} 
   */
  setSystemModel(props) {
    return this.dispatch(struct(SystemAction.BASE_UPDATE, {
      ...props,
      project_id: this.state.vm.project.id
    }))
  }

  /**
   * @param {object} props
   * @return {Store<T>} 
   */
  setModuleModel(props) {
    return this.dispatch(struct(ModuleAction.BASE_UPDATE, props))
  }

  /**
   * @param {object} props
   * @return {Store<T>} 
   */
  setInterfaceModel(props) {
    return this.dispatch(struct(InterfaceAction.BASE_UPDATE, props))
  }

  /**
   * @param {object} props
   * @return {Store<T>} 
   */
  setLogCodeModel(props) {
    return this.dispatch(struct(LogCodeAction.BASE_UPDATE, props))
  }

  /**
   * 新增元素后排序规则
   * @param {Array} list 
   * @param {*} model 
   * @return {Array}
   */
  static addModelRule(list, model) {
    return list.concat(model).reverse()
  }

  /**
   * 更新元素后排序规则
   * @param {Array} list 
   * @param {object} model 
   */
  static updateModelRule(list, model) {
    const result = []
    let u = null
    for (let m of list) {
      if (m.id === model.id) {
        u = { ...m, ...model }
        continue
      }
      result.push(m)
    }

    return u !== null ? [u].concat(result) : result
  }

  static listToMapByItemId(list) {
    const map = new Map()
    for (let item of list) {
      map.set(item.id, item)
    }
    return map
  }

  static logCodeFilterChain(state) {
    let { systems, modules, interfaces, codes } = state

    const sm = Storage.listToMapByItemId(systems)
    modules = modules.filter(r => sm.has(r.system_id))

    const mm = Storage.listToMapByItemId(modules)
    interfaces = interfaces.filter(r => mm.has(r.module_id))

    const im = Storage.listToMapByItemId(interfaces)
    codes = codes.filter(r => mm.has(r.modules_id) && (r.interface_id ? im.has(r.interface_id) : true))

    return {
      systems,
      modules,
      interfaces,
      codes
    }
  }

  /**
   * 添加系统码
   * @return {Promise.<void>}
   */
  async addSystem() {
    const state = await this.dispatchAsync(struct(SystemAction.BASE_CREATE))
    await this.showTips(state.SystemCode.message ? state.SystemCode.message : '新增系统码成功')
    if (!state.SystemCode.message) {
      await this.dispatchAsync(struct(VMAction.UPDATE, {
        systems: Storage.addModelRule(state.vm.systems, state.SystemCode)
      }))
    }
  }

  /**
   * 更新系统码
   * @return {Promise.<void>}
   */
  async updateSystem() {
    const state = await this.dispatchAsync(struct(SystemAction.UPDATE))
    await this.showTips(state.SystemCode.message ? state.SystemCode.message : '更新系统码成功')

    if (state.SystemCode.message === null) {
      await await this.dispatchAsync(struct(VMAction.UPDATE, {
        systems: Storage.updateModelRule(state.vm.systems, state.SystemCode)
      }))
    }
  }

  /**
   * 添加产品线
   * @return {Promise.<void>}
   */
  async addModule() {
    const state = await this.dispatchAsync(struct(ModuleAction.BASE_CREATE))
    await this.showTips(state.ModuleCode.message ? state.ModuleCode.message : '新增产品线成功')

    if (!state.ModuleCode.message) {
      await this.dispatchAsync(struct(VMAction.UPDATE, {
        modules: Storage.addModelRule(state.vm.modules, state.ModuleCode)
      }))
    }
  }

  /**
   * 更新产品线
   * @return {Promise.<void>}
   */
  async updateModule() {
    const state = await this.dispatchAsync(struct(ModuleAction.UPDATE))
    await this.showTips(state.ModuleCode.message ? state.ModuleCode.message : '更新产品线成功')

    if (state.ModuleCode.message === null) {
      await await this.dispatchAsync(struct(VMAction.UPDATE, {
        modules: Storage.updateModelRule(state.vm.modules, state.ModuleCode)
      }))
    }
  }

  /**
   * 新增错接口方
   * @return {Promise.<void>}
   */
  async addInterface() {
    const state = await this.dispatchAsync(struct(InterfaceAction.BASE_CREATE))
    await this.showTips(state.InterfaceCode.message ? state.InterfaceCode.message : '新增接口方成功')

    if (!state.InterfaceCode.message) {
      await this.dispatchAsync(struct(VMAction.UPDATE, {
        interfaces: Storage.addModelRule(state.vm.interfaces, state.InterfaceCode)
      }))
    }
  }

  /**
   * 更新接口方
   * @return {Promise.<void>}
   */
  async updateInterface() {
    const state = await this.dispatchAsync(struct(InterfaceAction.UPDATE))
    await this.showTips(state.InterfaceCode.message ? state.InterfaceCode.message : '更新接口方成功')

    if (state.InterfaceCode.message === null) {
      await await this.dispatchAsync(struct(VMAction.UPDATE, {
        interfaces: Storage.updateModelRule(state.vm.interfaces, state.InterfaceCode)
      }))
    }
  }

  /**
   * 新增错误码
   * @return {Promise.<void>}
   */
  async addLogCode() {
    const state = await this.dispatchAsync(struct(LogCodeAction.CREATE))
    await this.showTips(state.LogCode.message ? state.LogCode.message : '新增错误码成功')

    if (!state.LogCode.message) {
      const pagination = state.vm.pagination
      await this.dispatchAsync(struct(VMAction.UPDATE, {
        codes: Storage.addModelRule(state.vm.codes, state.LogCode),
        pagination: {
          ...pagination,
          count: pagination.count + 1,
          currentPage: 1
        }
      }))
    }
  }

  /**
   * 更新错误码
   * @return {Promise.<void>}
   */
  async updateLogCode() {
    const state = await this.dispatchAsync(struct(LogCodeAction.UPDATE))
    await this.showTips(state.LogCode.message ? state.LogCode.message : '更新错误码成功')

    if (state.LogCode.message === null) {
      await await this.dispatchAsync(struct(VMAction.UPDATE, {
        codes: Storage.updateModelRule(state.vm.codes, state.LogCode),
        pagination: {
          ...state.vm.pagination,
          currentPage: 1
        }
      }))
    }
  }

  /**
   * @param {object} values
   * @return {Store<T>}
   */
  setVMStorage(values) {
    return this.dispatch(struct(VMAction.UPDATE_STORAGE, values))
  }

  /**
   * @param {object} filter
   * @return {Store<T>}
   */
  setVMFilter(filter) {
    return this.dispatch(struct(VMAction.UPDATE_FILTER, filter))
  }


  /**
   * @param {LogCodeSystemCodeModel} system
   * @return {Promise.<void>}
   */
  async destroySystemCode(system) {
    await this.dispatchAsync(struct(SystemAction.RESET, system))
    let state = await this.dispatchAsync(struct(SystemAction.DESTROY, null))
    await this.showTips(state.SystemCode.message ? state.SystemCode.message : '删除系统码成功')

    if (state.SystemCode.message === null) {
      await await this.dispatchAsync(struct(VMAction.UPDATE, Storage.logCodeFilterChain({
        systems: state.vm.systems.filter(r => r.id !== system.id),
        modules: state.vm.modules,
        interfaces: state.vm.interfaces,
        codes: state.vm.codes
      })))
      this.onPageChange(1, state.vm.pagination.pageSize)
    }
  }

  /**
   * @param {LogCodeModuleCode} module
   * @return {Promise.<void>}
   */
  async destroyModuleCode(module) {
    await this.dispatchAsync(struct(ModuleAction.RESET, module))
    let state = await this.dispatchAsync(struct(ModuleAction.DESTROY, null))
    await this.showTips(state.ModuleCode.message ? state.ModuleCode.message : '删除产品线成功')

    if (state.ModuleCode.message === null) {
      await await this.dispatchAsync(struct(VMAction.UPDATE, Storage.logCodeFilterChain({
        systems: state.vm.systems,
        modules: state.vm.modules.filter(r => r.id !== module.id),
        interfaces: state.vm.interfaces,
        codes: state.vm.codes
      })))
      this.onPageChange(1, state.vm.pagination.pageSize)
    }
  }

  /**
   * @param {LogCodeInterfaceCodeModel} inter
   * @return {Promise.<void>}
   */
  async destroyInterfaceCode(inter) {
    await this.dispatchAsync(struct(InterfaceAction.RESET, inter))
    let state = await this.dispatchAsync(struct(InterfaceAction.DESTROY, null))
    await this.showTips(state.InterfaceCode.message ? state.InterfaceCode.message : '删除接口方成功')

    if (state.InterfaceCode.message === null) {
      await await this.dispatchAsync(struct(VMAction.UPDATE, Storage.logCodeFilterChain({
        systems: state.vm.systems,
        modules: state.vm.modules,
        interfaces: state.vm.interfaces.filter(r => r.id !== inter.id),
        codes: state.vm.codes
      })))
      this.onPageChange(1, state.vm.pagination.pageSize)
    }
  }

  /**
   * @param {LogCodeLogCodeModel} logCode
   * @return {Promise.<void>}
   */
  async destroyLogCode(logCode) {
    await this.dispatchAsync(struct(LogCodeAction.RESET, logCode))
    let state = await this.dispatchAsync(struct(LogCodeAction.DESTROY, null))
    await this.showTips(state.LogCode.message ? state.LogCode.message : '删除错误码成功')

    if (state.LogCode.message === null) {
      await await this.dispatchAsync(struct(VMAction.UPDATE, {
        codes: state.vm.codes.filter(r => r.id !== logCode.id)
      }))
      this.onPageChange(1, state.vm.pagination.pageSize)
    }
  }

  /**
   * @param {string} tips
   * @return {Promise.<void>}
   */
  async showTips(tips) {
    await this.dispatchAsync(struct(VMAction.UPDATE, { tips }))
    await this.dispatchAsync(struct(VMAction.UPDATE, { tips: null }))
  }

  /**
   * 
   * @param {boolean} visible 
   * @param {LogCodeSystemCodeModel} editor_system 
   * @return {Store<T>}
   */
  openSystemEditor(visible, editor_system) {
    return this.dispatch([
      struct(SystemAction.RESET, editor_system),
      struct(VMAction.UPDATE, { visibleSystemModal: visible }),
      struct(VMAction.UPDATE_STORAGE, { editor_system })
    ])
  }

  /**
   * @param {boolean} visible 
   * @param {LogCodeModuleCode} editor_module
   * @return {Store<T>}
   */
  openModuleEditor(visible, editor_module) {
    return this.dispatch([
      struct(ModuleAction.RESET, editor_module),
      struct(VMAction.UPDATE, { visibleModuleModal: visible }),
      struct(VMAction.UPDATE_STORAGE, { editor_module })
    ])
  }

  /**
   * 
   * @param {boolean} visible 
   * @param {LogCodeInterfaceCodeModel} editor_inter
   * @return {Store<T>}
   */
  openInterfaceEditor(visible, editor_inter) {
    return this.dispatch([
      struct(InterfaceAction.RESET, editor_inter),
      struct(VMAction.UPDATE, { visibleInterfaceModal: visible }),
      struct(VMAction.UPDATE_STORAGE, { editor_inter })
    ])
  }

  /**
  * 
  * @param {boolean} visible 
  * @param {LogCodeLogCodeModel} editor_inter 
  * @return {Store<T>}
  */
  openLogCodeEditor(visible, logCode) {
    return this.dispatch([
      struct(LogCodeAction.RESET, logCode),
      struct(VMAction.UPDATE, { visibleLogCodeModal: visible }),
      struct(VMAction.UPDATE_STORAGE, { editor_log_code: logCode })
    ])
  }

  /**
   * 
   * @param {boolean} visible 
   * @param {?LogCodeSystemCodeModel} editor_system 
   * @return {boolean}
   */
  createLogCodeFromFile(file) {
    // 清理原有的记录
    this.dispatch(struct(VMAction.UPDATE, {
      progress: 0,
      uploaded: 0,
      uploadFaild: 0,
      file,
      pause: false
    }))
    this.dispatch(struct(VMAction.CREATE_FROM_FILE, file))
    return false
  }

  onPageChange(currentPage, pageSize) {
    return this.dispatch(struct(VMAction.PAGE_CHANGE, { currentPage, pageSize }))
  }

  search() {
    return this.dispatch(struct(VMAction.PAGE_CHANGE, { currentPage: 1, pageSize: this.state.vm.pagination.pageSize }))
  }

  pause() {
    return this.dispatch(struct(VMAction.PAUSE))
  }

  resume() {
    return this.dispatch(struct(VMAction.RESUME))
  }

  sampleFile() {
    return this.dispatch(struct(VMAction.SAMPLE_FILE))
  }
}
