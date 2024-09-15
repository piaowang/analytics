/**
 * Created by asd on 17-7-31.
 */

import { PropTypes, defineTypes } from '../../common/checker'
import { Response } from '../utils/Response'
import db from '../models'

const $checker = {
  destroy: defineTypes({
    id: PropTypes.string.isRequired
  })
}

export default {
  /**
   * @param {String} id
   * @param {Object} [transaction]
   * @return {Promise.<ResponseStruct<String>>}
   */
  async destroy(id, transaction){
    const checked = $checker.destroy({ id })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const rows = await db.SugoAnalysisAssociate.destroy({
      where: {
        id
      },
      transaction
    })

    return rows > 0 ? Response.ok(id) : Response.fail('操作失败')
  }
}

