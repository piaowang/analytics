/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/11
 * @description
 */

import { HTTP_RESPONSE_STATUS, MEDIA_TYPES, Response, ResponseStructure } from 'response'

/**
 * @typedef {object} ResponseStruct
 * @property {boolean} success
 * @property {string} type
 * @property {number} code
 * @property {*} body
 * @property {?string} message
 */

/**
 * @param {Koa.Context} ctx
 * @param {ResponseStruct} response
 * @return {Koa.Context}
 */
function response(ctx, response) {
  ctx.body = response
  ctx.status = response.code
  ctx.set('Content-Type', response.type)
  return ctx
}

/**
 * @param {Koa.Context} ctx
 * @param {ServiceStruct<*>} struct
 * @return {Koa.Context}
 */
export function structure(ctx, struct) {
  return response(ctx, struct.success
    ? ResponseStructure.wrapper(Response.struct(
      struct.result,
      HTTP_RESPONSE_STATUS.OK.code,
      MEDIA_TYPES.APPLICATION_JSON))

    : ResponseStructure.wrapper(Response.struct(
      struct.result,
      HTTP_RESPONSE_STATUS.BAD_REQUEST.code,
      MEDIA_TYPES.APPLICATION_JSON),
    struct.message
    )
  )
}

export default response
