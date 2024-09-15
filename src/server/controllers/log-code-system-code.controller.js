/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

import ServiceClass from '../services/log-code-system-code.service'
import { structure } from '../response-handle'
import {removeAllEmptyValues} from '../../common/sugo-utils'

const Service = ServiceClass.getInstance()
// TODO 所有的操作验证当前用户是否有操盘权限

export default {
  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async create(ctx) {
    const { code, name, project_id, description } = ctx.q
    return structure(ctx, await Service.create(code, name, project_id, description || null))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findProjectSystems(ctx) {
    let {project_id, code_keyword, limit} = ctx.q
    let where = removeAllEmptyValues({
      project_id,
      code: {$like: code_keyword && `%${code_keyword}%`}
    })
    let struct = await Service.__findAll(where, limit ? {limit} : undefined)
    return structure(ctx, struct)
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findById(ctx) {
    return structure(ctx, await Service.findById(ctx.q.id))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findByCode(ctx) {
    return structure(ctx, await Service.findByCode(ctx.q.project_id, ctx.q.code))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async update(ctx) {
    return structure(ctx, await Service.update(ctx.q.id, ctx.q.code, ctx.q.name))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async destroy(ctx) {
    return structure(ctx, await Service.destroy(ctx.q.id))
  }
}

