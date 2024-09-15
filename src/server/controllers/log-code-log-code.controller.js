/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/11
 * @description
 */

import _ from 'lodash'
import ServiceClass from '../services/log-code-log-code.service'
import { Structure } from '../utils/service-result-structure'
import { structure } from '../response-handle'
import SouthernSystem from '../services/log-code-system-code.service'
import {removeAllEmptyValues} from '../../common/sugo-utils'
import Model from '../../common/model-validator/LogCodeLogCode'

export default {

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findById(ctx) {
    return structure(ctx, await ServiceClass.getInstance().findById(ctx.q.id))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findByCode(ctx) {
    return structure(ctx, await ServiceClass.getInstance().findByCode(ctx.q.system_id, ctx.q.code))
  },

  /**
   * 查询一个项目下的所有错误码
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findProjectLogCode(ctx) {
    let {project_id, code_keyword, limit} = ctx.q
    const valid = Model.validOne('project_id', project_id)
    if (valid !== null) {
      return structure(ctx, Structure.fail(valid))
    }

    const SystemRes = await SouthernSystem.getInstance().findProjectSystems(project_id)
    if (!SystemRes.success) {
      return SystemRes
    }
    let res = await ServiceClass.getInstance().__findAll(removeAllEmptyValues({
      system_id: {$in: SystemRes.result.map(r => r.id)},
      code: {$like: code_keyword && `%${code_keyword}%`}
    }), limit ? {limit} : undefined)

    return structure(ctx, res)
  },

  /**
   * 分页查询所有的错误码
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findAllByPage(ctx) {
    const { system_id, module_id, interface_id, like, pageSize, currentPage } = ctx.q
    const where = {}

    let system_filter = null
    if (_.isString(system_id) && system_id !== '') {
      system_filter = system_id
    } else if (_.isArray(system_id) && system_id.length > 0 && system_id.every(r => _.isString(r) && r !== '')) {
      system_filter = {
        $in: system_id
      }
    }

    if (system_filter === null) {
      return structure(ctx, Structure.fail('system id required'))
    }

    where.system_id = system_filter

    if (system_id) {
      where.system_id = _.isArray(system_id) ? { $in: system_id } : system_id
    }

    if (module_id) {
      where.module_id = module_id
    }

    if (interface_id) {
      where.interface_id = interface_id
    }

    if (like) {
      where.code = {
        $like: `%${like}%`
      }
    }
    return structure(ctx, await ServiceClass.getInstance().findAllByPage(where, pageSize, currentPage))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async create(ctx) {
    return structure(ctx, await ServiceClass.getInstance().create(
      ctx.q.system_id,
      ctx.q.module_id,
      ctx.q.interface_id || null,
      ctx.q.code,
      ctx.q.name || null
    ))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async bulkCreate(ctx) {
    return structure(ctx, await ServiceClass.getInstance().bulkCreate(
      ctx.q.project_id,
      /** @type {Array<{system, module, code, name}>} */
      ctx.q.models
    ))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async update(ctx) {
    return structure(ctx, await ServiceClass.getInstance().update(
      ctx.q.id,
      ctx.q.code,
      ctx.q.name
    ))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async destroy(ctx) {
    return structure(ctx, await ServiceClass.getInstance().destroy(ctx.q.id))
  }
}

