/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   29/01/2018
 * @description
 */

import { BaseService, mapValues, passValid } from './base.service'
import { Structure } from '../utils/service-result-structure'
import Model from '../../common/model-validator/LogCodeSystemCode'
import db from '../models'

export default class LogCodeSystemCode extends BaseService {

  /** @type {LogCodeSystemCode} */
  static instance = null

  constructor() {
    super('LogCodeSystemCode')
  }

  /**
   * @return {LogCodeSystemCode}
   * @static
   */
  static getInstance() {
    if (LogCodeSystemCode.instance === null) {
      LogCodeSystemCode.instance = new LogCodeSystemCode()
    }
    return LogCodeSystemCode.instance
  }

  /**
   * @param {string} project_id
   * @param {string} code
   * @return {Promise.<ServiceStruct<LogCodeSystemCodeModel>>}
   */
  async findByCode(project_id, code) {
    return await this.__findOne({ project_id, code })
  }

  /**
   * @param {string} datasource_name
   * @return {Promise.<ServiceStruct<LogCodeSystemCodeModel>>}
   */
  async findProjectSystemsByDataSource(datasource_name) {
    if (typeof datasource_name !== 'string' || datasource_name === '') {
      return Structure.fail('datasource_name required and must be a string')
    }

    const ProjectIns = await db.SugoProjects.findAll({
      where: {
        datasource_name
      }
    })

    return await this.__findAll({
      project_id: {
        $in: ProjectIns.map(r => r.id)
      }
    })
  }

  /**
   * @param {String} project_id
   * @return {Promise.<ServiceStruct.<Array<LogCodeSystemCodeModel>>>}
   */
  async findProjectSystems(project_id) {
    return await this.__findAll({ project_id })
  }

  /**
   * @param {String} code
   * @param {String} name
   * @param {String} project_id
   * @param {?String} description
   * @return {Promise.<ServiceStruct<LogCodeSystemCodeModel>>}
   */
  async create(code, name, project_id, description) {
    const valid = Model.valid({ code, name, project_id, description })
    if (!passValid(valid)) {
      return Structure.fail(mapValues(valid).join('\n'))
    }

    const project = db.SugoProjects.findOne({
      where: {
        id: project_id
      }
    })

    if (!project) {
      return Structure.fail(`未找到[${project_id}]项目记录`)
    }

    // 去重
    const record = await this.findByCode(project_id, code)
    if (record.success) {
      return Structure.fail(`[${code}]已存在`)
    }
    return await this.__create({ code, name, project_id, description })
  }

  /**
   * 更新系统码，方便起见，code与name为必填项
   * @param {String} id
   * @param {String} code
   * @param {String} name
   * @return {Promise.<ServiceStruct.<LogCodeSystemCodeModel>>}
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

    const same = await this.findByCode(record.result.project_id, code)
    if (same.success && same.result.id !== id) {
      return Structure.fail(`系统[${code}]已存在`)
    }

    return await this.__update({ id }, { code, name })
  }

  /**
   * @param {String} id
   * @return {Promise.<ServiceStruct<{id:String}>>}
   */
  async destroy(id) {
    // 删除系统下所有产品线、接口方、错误码
    return await db.client.transaction(async transaction => {

      await db.LogCodeModuleCode.destroy({
        where: { system_id: id },
        transaction
      })

      await db.LogCodeInterfaceCode.destroy({
        where: { system_id: id },
        transaction
      })

      await db.LogCodeLogCode.destroy({
        where: { system_id: id },
        transaction
      })

      return await this.__destroy({ id }, transaction)
    })
  }
}

