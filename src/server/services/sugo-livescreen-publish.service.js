import { BaseService } from './base.service'
import db from '../models'
import _ from 'lodash'
import moment from 'moment'
import { EXAMINE_TYPE } from '../../common/constants'

export default class SugoLivescreenPublishService extends BaseService {

  static instance = null

  constructor() {
    super('SugoLivescreenPublish')
  }

  static getInstance() {
    if (SugoLivescreenPublishService.instance === null) {
      SugoLivescreenPublishService.instance = new SugoLivescreenPublishService()
    }
    return SugoLivescreenPublishService.instance
  }

  async getOneScreen(where) {
    const query = {
      where: where,
      include: [{ model: db.SugoLivescreenPublishComponent, as: 'components' }]
    }
    return await this.dbInstance.findOne(query)
  }

  async publishLivescreen(id, transaction) {
    const livescreen = await db.SugoLiveScreen.findOne({
      where: { id },
      raw: true
    })
    if (_.isEmpty(livescreen)) {
      throw new Error('需要发布的数据不存在')
    }
    const components = await db.SugoLiveScreenComponent.findAll({
      where: { screen_id: id },
      raw: true
    })
    await db.SugoLivescreenPublish.destroy({ where: { id }, transaction })
    await db.SugoLivescreenPublish.create({
      ...livescreen,
      created_at: moment()
    }, { transaction })

    await db.SugoLivescreenPublishComponent.destroy({ where: { screen_id: id }, transaction })
    await db.SugoLivescreenPublishComponent.bulkCreate(components, { transaction })
  }

  /**
   * 删除大屏
   *
   * @param {any} company_id 
   * @param {any} id
   * @returns
   */
  async deleteLiveScreen(company_id, id) {

    return await db.client.transaction(async transaction => {
      // 先删除所有组件
      await db.SugoLivescreenPublishComponent.destroy({
        where: { screen_id: id },
        transaction
      })
  
      return await db.SugoLivescreenPublish.destroy({
        where: {
          id,
          company_id
        },
        transaction
      })
    })
  }


  /**
   * 大屏移入回收站
   *
   * @param {any} company_id 
   * @param {any} id
   * @returns
   */
  async recycleLiveScreen(company_id, id) {
    const res = await db.SugoLivescreenPublish.update({ status: 0 }, {
      where: {
        id,
        company_id
      }
    })

    return res
  }

  /**
 * 大屏从回收站还原
 *
 * @param {any} company_id 
 * @param {any} id
 * @returns
 */
  async reductionLiveScreen(company_id, id) {
    return await db.SugoLivescreenPublish.update({ status: 1 }, {
      where: {
        id,
        company_id
      }
    })
  }
}
