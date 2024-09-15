/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   29/01/2018
 * @description
 */

import { BaseService, mapValues, passValid } from './base.service'
import { Structure } from '../utils/service-result-structure'
import Model from '../../common/model-validator/LogCodeModuleCode'
import LogCodeSystemCode from './log-code-system-code.service'
import db from '../models'

export default class SouthernModelCode extends BaseService {

  /** @type {SouthernModelCode} */
  static instance = null

  constructor() {
    super('LogCodeModuleCode')
  }

  /**
   * @return {SouthernModelCode}
   */
  static getInstance() {
    if (SouthernModelCode.instance === null) {
      SouthernModelCode.instance = new SouthernModelCode()
    }
    return SouthernModelCode.instance
  }

  /**
   * @param {String} system_id
   * @param {String} code
   * @return {Promise.<ServiceStruct<LogCodeModuleCode>>}
   */
  async findByCode(system_id, code) {
    return await this.__findOne({ system_id, code })
  }

  /**
   * @param {Array<String>} system_ids
   * @return {Promise.<ServiceStruct.<Array<LogCodeModuleCode>>>}
   */
  async findSystemsModules(system_ids) {
    return await this.__findAll({
      system_id: {
        $in: system_ids
      }
    })
  }

  /**
   *
   * @param project_id
   * @return {Promise.<ServiceStruct<Array<LogCodeModuleCode>>>}
   */
  async findProjectModules(project_id) {
    const SystemsRes = await LogCodeSystemCode.getInstance().findProjectSystems(project_id)
    if (!SystemsRes.success) {
      return SystemsRes
    }

    return await this.findSystemsModules(SystemsRes.result.map(r => r.id))
  }

  /**
   * @param {String} code
   * @param {String} system_id
   * @return {Promise.<ServiceStruct<LogCodeModuleCode>>}
   */
  async create(code, system_id) {
    const valid = Model.valid({ code, system_id })
    if (!passValid(valid)) {
      return Structure.fail(mapValues(valid).join('\n'))
    }

    const system = await LogCodeSystemCode.getInstance().findById(system_id)
    if (!system.success) {
      return system
    }

    const record = await this.findByCode(system_id, code)
    if (record.success) {
      return Structure.fail(`[${code}]已存在`)
    }

    return await this.__create({ code, system_id })
  }

  /**
   * @param {String} id
   * @param {String} code
   * @return {Promise.<ServiceStruct<{code:String}>>}
   */
  async update(id, code) {
    const valid = Model.valid({ id, code })

    if (!passValid(valid)) {
      return Structure.fail(mapValues(valid).join('\n'))
    }

    const record = await this.findById(id)
    if (!record.success) {
      return Structure.fail('记录不存在')
    }

    const same = await this.findByCode(record.result.system_id, code)
    if (same.success && same.result.id !== id) {
      return Structure.fail(`产品线[${code}]已存在`)
    }

    return await this.__update({ id }, { code })
  }

  /**
   * @param {String} id
   * @return {Promise.<ServiceStruct<{id:String}>>}
   */
  async destroy(id) {
    // 删除产品线下所有的接口方、错误码
    return await db.client.transaction(async transaction => {

      await db.LogCodeInterfaceCode.destroy({
        where: { module_id: id },
        transaction
      })

      await db.LogCodeLogCode.destroy({
        where: { module_id: id },
        transaction
      })

      return await this.__destroy({ id }, transaction)
    })
  }
}

