/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/23
 * @description
 */

import ServerClass from '../services/log-code-module-code.service'
import { structure } from '../response-handle'
import {removeAllEmptyValues} from '../../common/sugo-utils'
import LogCodeSystemCode from '../services/log-code-system-code.service'

const Service = ServerClass.getInstance()

export default {
  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async create(ctx) {
    return structure(ctx, await Service.create(ctx.q.code, ctx.q.system_id))
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
    return structure(ctx, await Service.findByCode(ctx.q.system_id, ctx.q.code))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findSystemsModules(ctx) {
    return structure(ctx, await Service.findSystemsModules(ctx.q.models))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async findProjectModules(ctx) {
    let {project_id, code_keyword, limit} = ctx.q
    const SystemsRes = await LogCodeSystemCode.getInstance().findProjectSystems(project_id)
    if (!SystemsRes.success) {
      return structure(ctx, SystemsRes)
    }
    let res = await Service.__findAll(removeAllEmptyValues({
      system_id: {$in: SystemsRes.result.map(r => r.id)},
      code: {$like: code_keyword && `%${code_keyword}%`}
    }), limit ? {limit} : undefined)

    return structure(ctx, res)
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async update(ctx) {
    return structure(ctx, await Service.update(ctx.q.id, ctx.q.code))
  },

  /**
   * @param {Koa.Context} ctx
   * @return {Promise.<Koa.Context>}
   */
  async destroy(ctx) {
    return structure(ctx, await Service.destroy(ctx.q.id))
  }
}
