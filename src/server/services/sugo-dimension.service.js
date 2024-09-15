/**
 * Created by asd on 17-7-31.
 */
import { PropTypes, defineTypes } from '../../common/checker'
import { Response } from '../utils/Response'
import db from '../models'
import _ from 'lodash'

const $checker = {
  findProjectDimensions: defineTypes({
    project_id: PropTypes.string.isRequired
  }),
  bulkCreate: defineTypes({
    project: PropTypes.object.isRequired,
    dimensions: PropTypes.array.isRequired
  })
}

export default {
  /**
   * @param {String} project_id
   * @return {Promise.<ResponseStruct<Array<DimensionModel>>>}
   */
  async findProjectDimensions(project_id){
    const checked = $checker.findProjectDimensions({ project_id })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.SugoDimensions.findAll({
      where: {
        parentId: project_id
      }
    })

    return Response.ok(ins.map(i => i.get({ plain: true })))
  },

  /**
   * @param {ProjectModel} project
   * @param {Array<Object>} dimensions
   * @param {Object} [transaction]
   * @return {Promise.<ResponseStruct<Array<DimensionModel>>>}
   */
  async bulkCreate(project, dimensions, transaction){
    const checked = $checker.bulkCreate({
      project,
      dimensions
    })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins_role = await db.SugoRole.findOne({
      where: {
        name: 'admin',
        company_id: project.company_id
      }
    })

    const dims = dimensions.map(d => {
      const defaultRoles = d.role_ids || []
      return {
        parentId: project.datasource_id,
        name: d.name,
        type: d.type,
        company_id: project.company_id,
        // 默认授权给 admin
        role_ids: ins_role ? _.uniq([ins_role.id, ...defaultRoles]) : defaultRoles
      }
    })

    const ins = await db.SugoDimensions.bulkCreate(dims, transaction ? { transaction } : void 0)
    return Response.ok(ins.map(i => i.get({ plain: true })))
  }
}

