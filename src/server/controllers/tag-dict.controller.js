/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2018/03/07
 * @description tag-dict.controller
 */

import ProjectService from '../services/sugo-project.service'
import TagDictService from '../services/sugo-tag-dict.service'
import _ from 'lodash'

/**
 * @description 标签字典ctroller
 * @export
 * @class TagDictController
 */
export default class TagDictController {

  /**
   * 查询一个项目标签字典表中所有有效记录
   * 有效记录：tag_value 不为空，tag_name 不为空
   *
   * @param {object} ctx
   * @return {Promise<ResponseStruct>}
   */
  async findAllValid(ctx) {
    const { project_id, limit = 999 } = ctx.q
    const res = await ProjectService.findOne(project_id)

    if (!res.success) {
      return ctx.body = res
    }
    let { company_id } = ctx.session.user
    let body = await TagDictService.execSQL(
      `SELECT * FROM sugo_tag_dictionary WHERE tag_datasource_name = '${res.result.tag_datasource_name}' AND company_id = '${company_id}' AND tag_value IS NOT NULL AND title IS NOT NULL AND title <> ''` // ,
      // {
      //   replacements: [limit]
      // }
    )
    body.result = body.result.map(d => {
      return {
        ...d,
        tag_name: d.title,
        type: d.sub_type + ''
      }
    })
    return ctx.body = body
  }

  /**
   * 查询某一字典表中某一标签所有有效记录
   *
   * @param ctx
   * @return {Promise<ResponseStruct>}
   */
  async findAllValidByName(ctx) {
    const { project_id, tag_names } = ctx.q
    const res = await ProjectService.findOne(project_id)
    let company_id = _.get(ctx, 'session.user.company_id')
    if (!res.success) {
      return ctx.body = res
    }

    const WHERE = tag_names.length === 1 ? ` ='${tag_names[0]}' ` : ` in(${tag_names.map(name => `'${name}'`).join(',')}) `
    let q
    if (company_id) {
      q = `SELECT * FROM sugo_tag_dictionary WHERE tag_datasource_name = '${res.result.tag_datasource_name}' AND company_id = '${company_id}' AND name ${WHERE} AND tag_value IS NOT NULL AND title IS NOT NULL AND title <> '' order by tag_order ASC`

    } else {
      q = `SELECT * FROM sugo_tag_dictionary WHERE tag_datasource_name = '${res.result.tag_datasource_name}' AND name ${WHERE} AND tag_value IS NOT NULL AND title IS NOT NULL AND title <> '' order by tag_order ASC`
    }

    let body = await TagDictService.execSQL(
      q
    )
    body.result = body.result.map(d => {
      return {
        ...d,
        tag_name: d.title,
        type: d.sub_type + ''
      }
    })
    return ctx.body = body
  }
}
