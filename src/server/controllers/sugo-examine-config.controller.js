import _ from 'lodash'
import {Response} from '../utils/Response'
import SugoExamineConfigService from '../services/sugo-examine-config.service'
import SugoExamineService from '../services/sugo-examine.service'
import db from '../models'
import shortid from 'shortid'
import {EXAMINE_TYPE} from '../../common/constants'

export default class SugoExamineController {

  constructor() {
    this.sugoExamineConfig_service = new SugoExamineConfigService()
    this.sugoExamineService = SugoExamineService.getInstance()
  }

  getExamines = async ctx => {
    const {pSize, page, institution_id, status, search } = ctx.q
    const where = {}
    if(institution_id) where.institution_id = institution_id
    if(status) where.status = status
    if(search) where.name = { $like: `%${search}%`}
    const res = await this.sugoExamineConfig_service.findAndCountAll(where, {
      order: [['created_at', 'DESC']],
      include: [{
        model: db.SugoInstitutions,
        attributes: ['name']
      }],
      offset: (page - 1)*pSize , limit: pSize
    })
    const list = await this.sugoExamineConfig_service.findAll()
    const taked_ids = list.map(o => o.institution_id)
    return ctx.body = Response.ok({...res, taked_ids})
  }

  getInstitutions = async ctx => {
    const res = await db.SugoInstitutions.findAll({order: [['updated_at', 'DESC']]})
    return ctx.body = Response.ok(res)
  }

  getMembersByInstitutionsId = async ctx => {
    const {institutions_id } = ctx.q
    const res = await db.SugoUser.findAll({
      where: { institutions_id }
      // include: [{
      //   model: db.SugoRole,
      //   attributes: ['name']
      // }]
    })
    return ctx.body = Response.ok(res)
  }
  
  saveExamineConfig = async ctx => {
    let { id, name, desc, institution_id, nodeList, model_type  = EXAMINE_TYPE.liveScreen } = ctx.q
    if (id) {
      const check = await this. sugoExamineService.findAll({ config_id: id, status: 1}, {raw: true})
      if(check.length) {
        return ctx.body = Response.fail('流程审核配置使用中，无法编辑！')
      }
      await this.sugoExamineConfig_service.update({
        name, desc, institution_id, info: nodeList, model_type
      }, {id })
    } else {
      await  this.sugoExamineConfig_service.create({
        id: shortid(), name, desc, institution_id, info: nodeList, status: 0, model_type
      })
    }
    return ctx.body = Response.ok()
  }

  getExamineConfigByExamineId = async ctx => {
    const {examineId } = ctx.q
    const res = await this.sugoExamineConfig_service.findOne({id: examineId})
    return ctx.body = Response.ok(res)
  }

  deleteExamineConfig = async ctx  => {
    const {id } = ctx.q
    await this.sugoExamineConfig_service.remove({id })
    return ctx.body = Response.ok()
  }
}
