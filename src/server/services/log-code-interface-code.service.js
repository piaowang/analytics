/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   29/01/2018
 * @description
 */

import { BaseService, mapValues, passValid } from './base.service'
import SouthernSystem from './log-code-system-code.service'
import SouthernModule from './log-code-module-code.service'
import Model from '../../common/model-validator/LogCodeInterfaceCode'
import { Structure } from '../utils/service-result-structure'
import db from '../models'

export default class LogCodeInterfaceCode extends BaseService {

  /** @type {LogCodeInterfaceCode} */
  static instance = null

  constructor() {
    super('LogCodeInterfaceCode')
  }

  /**
   * @return {LogCodeInterfaceCode}
   */
  static getInstance() {
    if (LogCodeInterfaceCode.instance === null) {
      LogCodeInterfaceCode.instance = new LogCodeInterfaceCode()
    }
    return LogCodeInterfaceCode.instance
  }

  /**
   * @param {String} module_id
   * @param {String} code
   * @return {Promise.<ServiceStruct<LogCodeInterfaceCodeModel>>}
   */
  async findByCode(module_id, code) {
    return await this.__findOne({ module_id, code })
  }

  /**
   * 使用code查询记录
   * @param {string} module_id
   * @param {string} code
   * @return {Promise.<ServiceStruct<LogCodeInterfaceCodeModel>>}
   */
  async findOneByCode(module_id, code) {
    return this.__findOne({ module_id, code })
  }

  /**
   * @param system_ids
   * @return {Promise.<ServiceStruct.<Array<LogCodeInterfaceCodeModel>>>}
   */
  async findSystemInterfaces(system_ids) {
    return await this.__findAll({
      system_id: {
        $in: system_ids
      }
    })
  }

  /**
   * @param {String} project_id
   * @return {Promise.<ServiceStruct<Array<LogCodeInterfaceCodeModel>>>}
   */
  async findProjectInterfaces(project_id) {
    const SystemRes = await SouthernSystem.getInstance().findProjectSystems(project_id)
    if (!SystemRes.success) {
      return SystemRes
    }
    return await this.findSystemInterfaces(SystemRes.result.map(r => r.id))
  }

  /**
   * @param {String} code
   * @param {String} name
   * @param {String} system_id
   * @param {String} module_id
   * @return {Promise.<ServiceStruct<LogCodeInterfaceCodeModel>>}
   */
  async create(code, name, system_id, module_id) {
    const valid = Model.valid({ code, name, system_id, module_id })
    if (!passValid(valid)) {
      return Structure.fail(mapValues(valid).join('\n'))
    }

    const system = await SouthernSystem.getInstance().findById(system_id)
    if (!system.success) {
      return system
    }

    const module = await SouthernModule.getInstance().findById(module_id)
    if (!module.success) {
      return module
    }


    const record = await this.findByCode(module_id, code)
    if (record.success) {
      return Structure.fail(`[${code}]已存在`)
    }

    return await this.__create({ code, name, system_id, module_id })
  }

  /**
   * @param {String} id
   * @param {String} code
   * @param {String} name
   * @return {Promise.<ServiceStruct.<Object>>}
   */
  async update(id, code, name) {
    const valid = Model.valid({ id, code, name })
    if (!passValid(valid)) {
      return Structure.fail(mapValues(valid).join('\n'))
    }
    const record = await this.findById(id)
    if (!record.success) {
      return Structure.fail('记录不存在')
    }

    const same = await this.findByCode(record.result.module_id, code)
    if (same.success && same.result.id !== id) {
      return Structure.fail(`接口方[${code}]已存在`)
    }
    // 因接口方code与错误码关联，所以只能改name，不能改code
    return await this.__update({ id }, { name })
  }

  /**
   * @param {String} id
   * @return {Promise.<ServiceStruct.<{id:String}>>}
   */
  async destroy(id) {
    // 删除接口方下所有的错误码
    return await db.client.transaction(async transaction => {

      await db.LogCodeLogCode.destroy({
        where: { interface_id: id },
        transaction
      })

      return await this.__destroy({ id }, transaction)
    })
  }
}

