// import { generate } from 'shortid'
// import short_id from 'shortid'
import _ from 'lodash'
import db from '../models'
import { generate } from 'shortid'
import { forAwaitAll } from '../../common/sugo-utils'
import { EXAMINE_TYPE} from '../../common/constants'

export default {
  /**
   * 创建一个大屏
   * 
   * @param {number} company_id
   * @param {number} user_id
   * @param {string} title
   * @param {number} template_id
   * @returns
   */
  async createLiveScreen(company_id, user_id, title, template_id, is_template, category_id) {
    if (template_id) {
      // 读取模板的大屏配置和所有组件配置，并复制
      const components = await db.SugoLivescreenPublishComponent.findAll({
        where: {
          screen_id: template_id
        },
        raw: true
      })

      const liveScreen = await db.SugoLiveScreen.findOne({
        where: {
          id: template_id
        },
        raw: true
      })
      const copy = _.omit(liveScreen, ['id', 'created_by', 'updated_by', 'created_at', 'updated_at'])
      Object.assign(copy, {
        title: title,
        created_by: user_id,
        is_template,
        is_published: false,
        company_id,
        category_id
      })

      return await db.client.transaction(async transaction => {
        const res = await db.SugoLiveScreen.create(copy, { transaction, raw: true })
        const copyComonents = components.map(component =>
          Object.assign(_.omit(component, ['id', 'screen_id']), { screen_id: res.id })
        )
        await db.SugoLiveScreenComponent.bulkCreate(copyComonents, { transaction })
        return res
      })
    }
    return await db.SugoLiveScreen.create({
      title,
      company_id,
      created_by: user_id,
      category_id
    })
  },

  /**
   * 检测大屏主题名是否重复
   *
   * @param {any} company_id
   * @param {any} title
   * @returns 
   */
  async checkThemeTitleDupli(company_id, title) {
    const res = await db.SugoLiveScreenTheme.findAll({
      where: {
        company_id,
        title
      }
    })
    return res.length !== 0
  },

  /**
 * 检测大屏名是否重复
 * 仅检查同一个用户下是否存在同名记录
 * @param {any} company_id
 * @param {any} title
 * @returns 
 */
  async checkTitleDupli(company_id, title, user_id) {
    const res = await db.SugoLiveScreen.findAll({
      where: {
        company_id,
        title,
        created_by: user_id
      }
    })
    return res.length !== 0
  },
  
  /**
   * 获取当前用户公司的所有大屏
   *
   * @param {number} company_id
   * @param {number} user
   * @param {object} query
   * @returns
   */
  async getMyCompanyScreens(company_id, user, query) {
    query = _.defaultsDeep({}, query, {
      where: {
        $or: [
          { company_id: company_id },
          { company_id: null }
        ]
      },
      attributes: [
        'id',
        'title',
        'is_template',
        'is_published',
        'screen_width',
        'screen_height',
        'scale_mode',
        'description',
        'background_image_id',
        'cover_image_id',
        'company_id',
        'created_by',
        'created_at',
        'updated_at',
        'status',
        'category_id'
      ],
      order: [
        ['created_at', 'DESC']
      ],
      raw: true
    })
    // 如果是对外访问则不限制 company_id
    if (!user) {
      delete query.where.$or
    }
    let res = await db.SugoLiveScreen.findAll(query)
    // 过滤授权和创建
    res = res.filter(p => p.created_by === user.id || _.includes(p.authorize_to, user.id))
    // 获取提交审核大屏
    let examine = await db.SugoLiveScreenExamine.findAll({
      where: { $or: [{ live_screen_id: { $in: res.map(p => p.id) } }, { examine_user: user.id }] },
      raw: true,
      attributes: ['status', 'live_screen_id']
    })
    // 比较 获得当前用户审核的大屏
    const differenceIds = _.difference(examine.map(p => p.live_screen_id), res.map(p => p.id))
    examine = _.keyBy(examine, p => p.live_screen_id)
    if (differenceIds.length) {
      const data = await db.SugoLiveScreen.findAll({ where: { id: { $in: differenceIds } }, attributes: query.attributes, raw: true })
      res = _.concat(res, data)
    }
    // 赋值审核状态
    res = res.map(p => ({ ...p, examine: _.get(examine, [p.id, 'status'], 0) }))
    return res
  },

  /**
   * 获取一个大屏和相关组件集合
   *
   * @param {any} company_id 
   * @param {any} user
   * @param {any} where
   * @returns 
   */
  async getOneScreen(company_id, user, where) {
    const query = {
      where: where,
      include: [{ model: db.SugoLiveScreenComponent, as: 'components', raw: true }]
    }
    return await db.SugoLiveScreen.findOne(query, { raw: true })
  },

  /**
   * 获取所有作为模板的大屏
   * 
   * @param {any} company_id
   * @returns
   */
  async getMyCompanyTemplateScreens(company_id) {
    const query = {
      where: {
        is_template: true,
        $or: [
          { company_id: company_id },
          { company_id: null }
        ]
      },
      attributes: [
        'id',
        'title'
      ],
      order: [
        ['updated_at', 'desc']
      ]
    }
    return await db.SugoLiveScreen.findAll(query)
  },

  /**
   * 更新大屏
   * 
   * @param {short_id} company_id
   * @param {short_id} user_id
   * @param {short_id} id
   * @param {object} updateValues
   * @param {array} addComponents
   * @returns
   */
  async updateLiveScreen(company_id, user_id, id, updateValues, forAddComps, forUpdateComps, forDeleteComps) {

    const liveScreenExamine = await db.SugoLiveScreenExamine.findOne({ where: { live_screen_id: id }, raw: true })

    return await db.client.transaction(async transaction => {
      // 如果审核表存在数据，每次看板更新，审核状态都修改为未提交审核的状态
      if (liveScreenExamine) {
        await db.SugoLiveScreenExamine.update({ status: 0 }, { where: { live_screen_id: id }, fields: ['status'], transaction })
      }
      const result = {}
      // 创建新加的组件
      if (forAddComps.length > 0) {
        result.added = await db.SugoLiveScreenComponent.bulkCreate(
          forAddComps.map(comp => Object.assign(comp, { screen_id: id })),
          { transaction }
        )
      }
      // 更新组件
      if (forUpdateComps.length > 0) {
        forUpdateComps.forEach(async comp => {
          if (comp.id) {
            await db.SugoLiveScreenComponent.update(comp, {
              where: {
                id: comp.id
              },
              transaction
            })
          }
        })
      }
      // 删除组件
      if (forDeleteComps.length > 0) {
        await db.SugoLiveScreenComponent.destroy({
          where: {
            id: {
              $in: forDeleteComps.map(comp => comp.id)
            }
          },
          transaction
        })
      }
      result.deleted = await db.SugoLiveScreen.update({
        ...updateValues,
        updated_by: user_id
      }, {
        where: {
          id
        },
        transaction
      })

      return result
    })
  },

  /**
   * 大屏移入回收站
   *
   * @param {any} company_id 
   * @param {any} id
   * @returns
   */
  async recycleLiveScreen(company_id, id) {

    return await db.SugoLiveScreen.update({ status: 0 }, {
      where: {
        id,
        company_id
      },
      fields: ['status']
    })
  },

  /**
 * 大屏从回收站还原
 *
 * @param {any} company_id 
 * @param {any} id
 * @returns
 */
  async reductionLiveScreen(company_id, id) {

    return await db.SugoLiveScreen.update({ status: 1 }, {
      where: {
        id,
        company_id
      },
      fields: ['status']
    })
  },

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
      await db.SugoLiveScreenComponent.destroy({
        where: { screen_id: id },
        transaction
      })
      // 删除审核表中的数据
      await db.SugoExamine.destroy({ where: { model_id: id , model_type: { $in: [EXAMINE_TYPE.liveScreen, EXAMINE_TYPE.liveScreenTemplate] } }, transaction })
  
      return await db.SugoLiveScreen.destroy({
        where: {
          id: {$in: id.split(',')},
          company_id
        },
        transaction
      })
    })
  },

  /**
   * 复制大屏
   * 
   * @param {any} company_id
   * @param {any} id
   */
  async copyLiveScreen(company_id, user_id, id) {
    const components = await db.SugoLiveScreenComponent.findAll({
      where: {
        screen_id: id
      },
      raw: true
    })
    return await db.client.transaction(async transaction => {
      const liveScreen = await db.SugoLiveScreen.findOne({
        where: {
          company_id,
          id
        },
        raw: true
      })
      const copy = _.omit(liveScreen, ['id', 'created_by', 'updated_by', 'created_at', 'updated_at'])
      Object.assign(copy, {
        title: `${copy.title}_复制`,
        created_by: user_id,
        is_published: false
      })
      const res = await db.SugoLiveScreen.create(copy, { transaction, raw: true })

      const copyComonents = components.map(component =>
        Object.assign(_.omit(component, ['id', 'screen_id']), { screen_id: res.id })
      )
      await db.SugoLiveScreenComponent.bulkCreate(copyComonents, { transaction })
      return res
    })
  },

  /**
   * 保存大屏模板
   * @param {*} id 
   * @param {*} updateValues 
   * @param {*} forAddComps 
   * @param {*} forUpdateComps 
   * @param {*} forDeleteComps 
   */
  async saveLiveScreenTemplate(id, templateInfo, user_id, company_id, forAddComps, forUpdateComps, forDeleteComps) {
    return await db.client.transaction(async transaction => {
      // 新增或修改大屏信息
      if (!id) {
        id = generate()
        const data = await db.SugoLiveScreen.findOne({
          where: {
            title: templateInfo.title
          }
        }, { raw: true })
        if (!_.isEmpty(data)) {
          transaction.rollback()
          throw new Error('模板名称已占用!')
        }
        await db.SugoLiveScreen.create({
          id,
          ...templateInfo,
          is_template: true,
          created_by: user_id,
          company_id
        }, { transaction })
      } else {
        await db.SugoLiveScreen.update({
          ...templateInfo,
          updated_by: user_id
        }, {
          where: { id },
          transaction
        })
      }

      // 创建新加的组件
      if (forAddComps.length > 0) {
        await db.SugoLiveScreenComponent.bulkCreate(
          forAddComps.map(comp => Object.assign(comp, { screen_id: id })),
          { transaction }
        )
      }
      // 更新组件
      if (forUpdateComps.length > 0) {
        await forAwaitAll(forUpdateComps, async comp => {
          if (comp.id) {
            await db.SugoLiveScreenComponent.update(comp, {
              where: {
                id: comp.id
              },
              transaction
            })
          }
        })
      }
      // 删除组件
      if (forDeleteComps.length > 0) {
        await db.SugoLiveScreenComponent.destroy({
          where: {
            id: {
              $in: forDeleteComps.map(comp => comp.id)
            }
          },
          transaction
        })
      }
      return true
    })
  },
  async getLiveScreenComponent() {
    return await db.SugoLiveScreenComponent.findAll({ raw: true })
  },
  async getLiveScreensById(ids) {
    return await db.SugoLiveScreen.findAll({ where: { id: { $in: ids } }, raw: true })
  },

  async findAll(where, option) {
    return await db.SugoLiveScreen.findAll({ where, ...option })
  },

  async update(value, where, option) {
    return await db.SugoLiveScreen.update(value, { where, ...option })
  }
}
