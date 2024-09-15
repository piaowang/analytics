/**
 * Created by asd on 17-7-31.
 */

import { PropTypes, defineTypes } from '../../common/checker'
import { Response } from '../utils/Response'
import db from '../models'
import Dim from '../../common/dimensions-utils'

import DimensionService from '../services/sugo-dimension.service'
import AnalysisAssociate from '../services/sugo-analysis-associate.service'

const $checker = {
  findOne: defineTypes({
    id: PropTypes.string.isRequired
  }),
  bulkCreate: defineTypes({
    project: PropTypes.object.isRequired,
    analysis: PropTypes.object.isRequired,
    dimensions: PropTypes.array.isRequired,
    inDimTable: PropTypes.bool
  })
}

export default {

  /**
   * @param {String} id - 分析表主键id
   * @return {Promise.<ResponseStruct>}
   */
  async findOne(id){
    const checked = $checker.findOne({ id })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.SugoDimensionsHBase.findOne({ where: { id } })
    return ins ? Response.ok(ins.get({ plain: true })) : Response.fail('未找到记录')
  },

  /**
   * 写入维度：
   * 1. 检测维度名是否合法
   * 2. 检测与已有维度类型是否匹配
   * 3. 写入记录并返回
   * @param {ProjectModel} project
   * @param {DataAnalysisModel} analysis
   * @param {Array<Object>} dimensions
   * @param {Boolean} [inDimTable] - 是否写入到维度表
   * @return {Promise.<ResponseStruct<Array<DataAnalysisModel>>>}
   */
  async bulkCreate(project, analysis, dimensions, inDimTable = true){

    const checked = $checker.bulkCreate({
      project,
      analysis,
      dimensions,
      inDimTable
    })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    // 检测name是否合法
    const fault = dimensions.filter(d => !Dim.checkName(d.name))

    if (fault.length) {
      return Response.fail(`维度名【${fault.map(dim => dim.name).join('`')}】非法`)
    }

    // 检测类型是否统一
    const res = await DimensionService.findProjectDimensions(project.datasource_id)
    if (!res.success) {
      return res
    }

    const exits = res.result
    const diff = Dim.getTypeDiff(dimensions, exits)

    if (diff.length) {
      return Response.fail(`字段【${diff.map(dim => dim.name).join('`')}】类型与此前不统一`)
    }

    // 找出新的维度并写入
    const pMap = Dim.nameMap(exits)
    const fresh = dimensions.filter(d => !pMap.get(d.name))

    return await db.client.transaction(async transaction => {
      const analysis_id = analysis.id

      // 删除关联关系
      await AnalysisAssociate.destroy(analysis_id, transaction)

      // 删除`analysis_id`的所有维度
      await db.SugoDimensionsHBase.destroy({
        where: {
          analysis_id
        },
        transaction
      })

      // 写入维度数据到 `sugo_dimensions_hbase`
      const dim_hbase = dimensions.map(dim => ({
        ...dim,
        analysis_id
      }))

      // 写入到 hbase 维度表
      const hbase = await db.SugoDimensionsHBase.bulkCreate(dim_hbase, {
        transaction
      })

      // 写入维度表
      if (inDimTable) {
        const res = await DimensionService.bulkCreate(project, fresh, transaction)
        if (!res.success) {
          return res
        }
      }

      return Response.ok({
        dimensions: hbase.map(i => i.get({ plain: true })),
        datasource_id: project.datasource_id
      })
    })

  }
}

