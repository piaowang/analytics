/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   09/12/2017
 * @description 错误码接口方属性接口
 */

import ServiceClass from '../services/log-code-interface-code.service'
import {structure} from '../response-handle'
import SouthernSystem from '../services/log-code-system-code.service'
import {removeAllEmptyValues} from '../../common/sugo-utils'

const Service = ServiceClass.getInstance()

export default {

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async create(ctx) {
    return structure(ctx, await Service.create(
      ctx.q.code,
      ctx.q.name,
      ctx.q.system_id,
      ctx.q.module_id
    ))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findById(ctx) {
    return structure(ctx, await ServiceClass.findById(ctx.q.id))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findByCode(ctx) {
    return structure(ctx, await Service.findByCode(ctx.q.module_id, ctx.q.code))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findSystemInterfaces(ctx) {
    return structure(ctx, await Service.findSystemInterfaces(ctx.q.models))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findProjectInterfaces(ctx) {
    let {project_id, code_keyword, limit} = ctx.q
    const SystemRes = await SouthernSystem.getInstance().findProjectSystems(project_id)
    if (!SystemRes.success) {
      return structure(ctx, res)
    }
    let res = await Service.__findAll(removeAllEmptyValues({
      system_id: {$in: SystemRes.result.map(r => r.id)},
      code: {$like: code_keyword && `%${code_keyword}%`}
    }), limit ? {limit} : undefined)

    return structure(ctx, res)
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async update(ctx) {
    return await structure(ctx, await Service.update(ctx.q.id, ctx.q.code, ctx.q.name))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async destroy(ctx) {
    return await structure(ctx, await Service.destroy(ctx.q.id))
  }
}
