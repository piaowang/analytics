


import sequelize from 'sequelize'
import db from '../models'
import {Response} from '../utils/Response'
import {defineTypes, PropTypes} from '../../common/checker'

/**
 * @description 标签字典表服务层
 * @export
 * @class TagDictService
 */
export default class TagDictService {

  static sqlParamsChecker = defineTypes({
    sql: PropTypes.string.isRequired
  })

  /**
   * 直接执行SQL
   *
   * 安全起见，该Service接口不能开放出去，只能服务器内部调用
   * @param {string} sql
   * @param {object} [options]
   * @return {Promise<ResponseStruct>}
   */
  static async execSQL(sql, options = {}) {
    const checked = TagDictService.sqlParamsChecker({sql})

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    if (db.tagsClient === null) {
      return Response.fail('未开启标签功能')
    }

    try {
      const resp = await db.tagsClient.query(sql, {
        type: sequelize.QueryTypes.SELECT,
        ...options
      })
      return Response.ok(resp)
    } catch (e) {
      console.log(e.stack)
      if (e.sql){
        console.log(e.sql)
      }
      return Response.fail(e.message)
    }
  }
}
