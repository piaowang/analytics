/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   29/01/2018
 * @description
 */

import { BaseService, mapValues, passValid } from './base.service'
import { Structure } from '../utils/service-result-structure'
import LogCodeSystemCode from './log-code-system-code.service'
import LogCodeModuleCode from './log-code-module-code.service'
import LogCodeInterfaceCode from './log-code-interface-code.service'
import Model, { CodeReg } from '../../common/model-validator/LogCodeLogCode'
import _ from 'lodash'

export default class LogCodeLogCode extends BaseService {

  /** @type {LogCodeLogCode} */
  static instance = null

  constructor() {
    super('LogCodeLogCode')
  }

  /**
   * @return {LogCodeLogCode}
   */
  static getInstance() {
    if (LogCodeLogCode.instance === null) {
      LogCodeLogCode.instance = new LogCodeLogCode()
    }
    return LogCodeLogCode.instance
  }

  /**
   * @param {string} system_id
   * @param {string} code
   * @return {Promise.<ServiceStruct<LogCodeLogCodeModel>>}
   */
  async findByCode(system_id, code) {
    return await this.__findOne({ system_id, code })
  }

  /**
   * @param {string} project_id
   * @return {Promise.<ServiceStruct<Array<LogCodeLogCodeModel>>>}
   */
  async findProjectLogCode(project_id) {
    const valid = Model.validOne('project_id', project_id)
    if (valid !== null) {
      return Structure.fail(valid)
    }

    // 1. 找出project_id下所有systems
    const SystemRes = await LogCodeSystemCode.getInstance().findProjectSystems(project_id)
    if (!SystemRes.success) {
      return SystemRes
    }

    // 2. 找出systems下所有错误码
    return await this.__findAll({
      system_id: {
        $in: SystemRes.result.map(r => r.id)
      }
    })
  }

  /**
   *
   * @param {object} where
   * @param {number} pageSize
   * @param {number} currentPage
   * @return {Promise.<ServiceStruct<{count:number,models:Array<LogCodeLogCodeModel>,pageSize:number,currentPage:number}>>}
   */
  async findAllByPage(where, pageSize, currentPage) {
    // TODO 整数验证
    if (!_.isNumber(pageSize)) {
      return Structure.fail('pageSize must be a number')
    }

    if (pageSize < 1) {
      return Structure.fail('pageSize must greater than 1')
    }

    if (!_.isNumber(currentPage)) {
      return Structure.fail('currentPage must be a number')
    }

    if (currentPage < 1) {
      return Structure.fail('currentPage must greater than 1')
    }

    const res = await this.__findAndCountAll(where, pageSize, Math.floor(pageSize * (currentPage - 1)))
    if (!res.success) {
      return res
    }

    return Structure.ok({
      count: res.result.count,
      models: res.result.rows,
      pageSize,
      currentPage
    })
  }

  /**
   * @param {String} system_id
   * @param {String} module_id
   * @param {?String} interface_id
   * @param {String} code
   * @param {?String} name
   * @return {Promise.<ServiceStruct<LogCodeLogCodeModel>>}
   */
  async create(system_id, module_id, interface_id, code, name) {
    const valid = Model.valid({ system_id, module_id, interface_id, code, name })
    if (!passValid(valid)) {
      return Structure.fail(mapValues(valid).join('\n'))
    }

    // 系统、产品线、接口方所属错误码唯一
    const where = { system_id, module_id, code }
    if (interface_id !== null) {
      where.interface_id = interface_id
    }

    const record = await this.__findOne(where)
    if (record.success) {
      return Structure.fail(`[${code}]已存在`)
    }

    // 检测系统是否存在
    const SystemRes = await LogCodeSystemCode.getInstance().findById(system_id)
    if (!SystemRes.success) {
      return SystemRes
    }

    // 检测接口方是否存在
    const ModuleRes = await LogCodeModuleCode.getInstance().findById(module_id)
    if (!ModuleRes.success) {
      return ModuleRes
    }

    // 如果有接口方，检测接口方是否存在
    // 否则从code中提取接口方信息
    if (interface_id !== null) {
      const InterfaceRes = await LogCodeInterfaceCode.getInstance().findById(interface_id)
      if (!InterfaceRes.success) {
        return InterfaceRes
      }
    } else {
      const [, interfaceCode] = code.match(CodeReg) || []
      if (interfaceCode) {
        const Res = await LogCodeInterfaceCode.getInstance().findOneByCode(module_id, interfaceCode)
        if (!Res.success) {
          return Res
        }
        interface_id = Res.result.id
      }
    }

    return await this.__create({ system_id, module_id, interface_id, code, name })
  }

  /**
   * @param {String} project_id
   * @param {Array<{system, module, code, name}>} list
   * @return {Promise.<ServiceStruct.<Array<LogCodeLogCodeModel>>>}
   */
  async bulkCreate(project_id, list) {
    const SystemsRes = await LogCodeSystemCode.getInstance().findProjectSystems(project_id)
    if (!SystemsRes.success) {
      return SystemsRes
    }

    const systemIds = SystemsRes.result.map(r => r.id)

    const ModulesRes = await LogCodeModuleCode.getInstance().findSystemsModules(systemIds)
    if (!ModulesRes.success) {
      return ModulesRes
    }

    const InterfacesRes = await LogCodeInterfaceCode.getInstance().findSystemInterfaces(systemIds)
    if (!InterfacesRes.success) {
      return InterfacesRes
    }

    const LogCodeRes = await this.findProjectLogCode(project_id)
    if (!LogCodeRes.success) {
      return LogCodeRes
    }

    /**
     * @param {Array<Object>} list
     * @param {String} key
     * @return {Map}
     */
    function handle(list, key) {
      const m = new Map()
      for (let item of list) {
        m.set(item[key], item)
      }
      return m
    }

    // TODO 按系统、产品线、接口方查code
    // 不同的系统下可能有相同的code
    // {id, system}
    const SystemIdMap = handle(SystemsRes.result, 'id')
    // {code, system}
    const SystemCodeMap = handle(SystemsRes.result, 'code')

    // 产品线按系统分，以系统code作为key
    const ModuleIdMap = handle(ModulesRes.result, 'id')
    const ModuleCodeMap = new Map()
    ModulesRes.result.forEach(function (modu) {
      let sys = SystemIdMap.get(modu.system_id)
      let arr = ModuleCodeMap.get(sys.code)
      if (arr === void 0) {
        arr = []
        ModuleCodeMap.set(sys.code, arr)
      }
      arr.push(modu)
    })
    ModuleCodeMap.forEach(function (arr, key) {
      ModuleCodeMap.set(key, handle(arr, 'code'))
    })

    // 接口方按系统、产品线分，以系统code+产品线code作为key
    const InterfaceIdMap = handle(InterfacesRes.result, 'id')
    const InterfaceCodeMap = new Map()
    InterfacesRes.result.forEach(function (inter) {
      let modu = ModuleIdMap.get(inter.module_id)
      let sys = SystemIdMap.get(modu.system_id)

      let key = sys.code + modu.code
      let arr = InterfaceCodeMap.get(key)

      if (arr === void 0) {
        arr = []
        InterfaceCodeMap.set(key, arr)
      }
      arr.push(inter)
    })
    InterfaceCodeMap.forEach(function (arr, key) {
      InterfaceCodeMap.set(key, handle(arr, 'code'))
    })

    // 错误码按系统、产品线、接口方分，以系统code+产品线code+接口方code作为key
    const LogCodeMap = new Map()
    LogCodeRes.result.forEach(function (code) {
      let modu = ModuleIdMap.get(code.module_id)
      let sys = SystemIdMap.get(modu.system_id)

      let key = sys.code + modu.code + code.code
      let arr = LogCodeMap.get(key)

      if (arr === void 0) {
        arr = []
        LogCodeMap.set(key, arr)
      }
      arr.push(code)
    })
    LogCodeMap.forEach(function (arr, key) {
      LogCodeMap.set(key, handle(arr, 'code'))
    })

    // 批量插入
    const inserts = []
    const failed = []
    let valid, length = list.length, rc
    let sys, modu, inter

    for (let i = 0; i < length; i++) {
      rc = list[i]
      valid = Model.valid(rc)

      // 格式验证失败
      if (!passValid(valid)) {
        failed.push(mapValues(valid))
        continue
      }

      // 系统不存在
      if (!SystemCodeMap.has(rc.system)) {
        failed.push(`系统[${rc.system}]不存在`)
        continue
      }

      // 产品线不存在
      sys = SystemCodeMap.get(rc.system)
      modu = ModuleCodeMap.has(rc.system) && ModuleCodeMap.get(rc.system).get(rc.module)
      if (modu === void 0) {
        failed.push(`系统[${rc.system}]不存在[${rc.module}]产品线`)
        continue
      }

      // 该系统下所有产品线
      let [, inter_code, code] = rc.code.match(CodeReg) || []
      inter = InterfaceCodeMap.get(rc.system + rc.module)

      // 接口方不存在
      if (inter_code && (!inter || !inter.get(inter_code))) {
        failed.push(`系统[${rc.system}]产品线[${rc.module}]不存在接口方[${inter_code}]`)
        continue
      }

      if (!code) {
        failed.push(`错误码[${rc.code}]格式错误`)
        continue
      }

      const key = rc.system + rc.module + rc.code
      if (LogCodeMap.has(key)) {
        failed.push(`系统[${rc.system}]产品线[${rc.module}]错误码[${rc.code}]已存在`)
        continue
      }

      const model = {
        system_id: sys.id,
        module_id: modu.id,
        interface_id: inter_code ? inter.get(inter_code).id : null,
        name: rc.name,
        code: rc.code
      }
      LogCodeMap.set(key, model)
      inserts.push(model)
    }

    const create = await this.__bulkCreate(inserts)
    if (!create.success) {
      return create
    }

    return Structure.ok({
      created: create.result,
      success: inserts.length,
      failed
    })
  }

  /**
   *
   * @param id
   * @param code
   * @param name
   * @return {Promise.<*>}
   */
  async update(id, code, name) {
    const valid = Model.valid({ code, name })
    if (!passValid(valid)) {
      return Structure.fail(mapValues(valid).join('\n'))
    }

    const record = await this.findById(id)
    if (!record.success) {
      return record
    }

    const same = await this.findByCode(record.result.system_id, code)
    if (same.success && same.result.id !== id) {
      return Structure.fail(`错误码[${code}]已存在`)
    }

    const [, interfaceCode] = code.match(CodeReg) || []

    // interface code 可以没有
    let InterfaceRes = null

    if (interfaceCode) {
      InterfaceRes = await LogCodeInterfaceCode.getInstance().findOneByCode(record.result.module_id, interfaceCode)
      if (!InterfaceRes.success) {
        return InterfaceRes
      }
    }

    return await this.__update({ id }, {
      code,
      interface_id: InterfaceRes ? InterfaceRes.result.id : null,
      name
    })
  }

  /**
   * @param {String} id
   * @return {Promise.<ServiceStruct<Object>>}
   */
  async destroy(id) {
    return await this.__destroy({ id })
  }
}

