/**
 * Created by asd on 17-7-12.
 * @file DataAnalysisModel相关接口
 * @see {DataAnalysisModel}
 */

import { PropTypes } from '../../common/checker'
import { Response } from '../utils/Response'
import db from '../models'
import _ from 'lodash'

export default {

  /**
   * 使用id查询记录详细
   * @param {String} id
   * @return {Promise.<ResponseStruct<DataAnalysisModel>>}
   */
  async findOne(id){
    const checked = PropTypes.string.isRequired({ id }, 'id')

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.SugoDataAnalysis.findOne({ where: { id } })
    return Response.ok(ins.get({ plain: true }))
  },

  /**
   * @param {Object} query
   * @return {Promise.<*>}
   */
  async findAll(query){
    const ins = await db.SugoDataAnalysis.findAll({...query, raw: true})
    return ins
  },

  /**
   * 更新
   * @param {String} id
   * @param {Object} model
   * @return {Promise.<Object>}
   */
  async update(id, model) {
    await db.SugoDataAnalysis.update(_.omit(model, 'id'), {
      where: {
        id
      }
    })
    return { ...model, id }
  },

  /**
   * @param {Object} model
   * @return {Promise.<Object>}
   */
  async create(model){
    const ins = await db.SugoDataAnalysis.create(model)
    return ins.get({ plain: true })
  },

  /**
   * @param {string} id
   * @return {Promise.<ResponseStruct<ProjectModel>>}
   */
  async findProject(id) {
    if (!id) {
      return Response.fail('[id] required and type is string')
    }

    const sql = 'SELECT * from sugo_projects where id = (select project_id from sugo_data_analysis where id =:id)'
    const ret = await db.client.query(sql, {
      replacements: { id },
      type: db.client.QueryTypes.SELECT
    })

    const record = ret[0]

    return record ? Response.ok(record) : Response.fail('未找到记录')
  }

}


