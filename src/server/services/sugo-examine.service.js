import { BaseService } from './base.service'
import _ from 'lodash'

export default class SugoExamineService extends BaseService {

  static instance = null

  constructor() {
    super('SugoExamine')
  }

  static getInstance() {
    if (SugoExamineService.instance === null) {
      SugoExamineService.instance = new SugoExamineService()
    }
    return SugoExamineService.instance
  }

  async getExamineStatus(modelType, modelIds) {
    let res = await this.__model.findAll({ where: { model_type: modelType, model_id: { $in: modelIds } }, raw: true })
    res = _.groupBy(res, p => p.model_id)
    res = _.mapValues(res, p => {
      if(p.length ===1 ) {
        return  _.first(p)
      }
      return _.last(_.orderBy(p, p => p.created_at))
    }, {})
    return res
  }

  async getExamineListByModelType(modeType, status, userId) {
    let where = {model_type: modeType}
    if(status) {
      where.status = status
    }
    let examine = await this.__model.findAll({where, raw: true })
    //排除审核中的
    let objs = await this.__model.findAll({ where: {model_id: {$in: examine.map(p => p.model_id )}, status: 1}, raw: true })
    objs = objs.map(p => p.model_id)
    if(!userId) {
      return examine
    }
    return examine.filter(p => (!_.includes(objs, p.model_id)) && (p.created_by === userId || _.some(p.examin_info, exa => exa.examin_user === userId)))
  }
}
