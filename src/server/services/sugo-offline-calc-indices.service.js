import {BaseService} from './base.service'
import conf from '../config'
import moment from 'moment'
import _ from 'lodash'
import db from '../models'

const {
  offlineCalcIndicesDefaultPrefix = 'SI-'
} = conf.site

export function genIndicesId(offset = 0) {
  const dayCount = moment().diff(0, 'day')
  const minuteCountInToday = moment().diff(moment().startOf('day'), 'minute')
  const minuteCountCompress = Math.floor(minuteCountInToday * (999/1440))
  // 自动生成指标 id 规则：SI-从1970年到今天的天数-今天分钟数压缩至0~999
  return `${offlineCalcIndicesDefaultPrefix}${dayCount}${minuteCountCompress + offset}`
}

let _inst = null
export default class SugoOfflineCalcIndicesService extends BaseService {
  constructor() {
    super('SugoOfflineCalcIndices')
  }
  
  static getInstance() {
    if (!_inst) {
      _inst = new SugoOfflineCalcIndicesService()
    }
    return _inst
  }
  
  async checkDepsIsPublic(item, transaction) {
    let idxDeps = _.get(item, 'formula_info.idxDeps', [])
    if (!_.isEmpty(idxDeps)) {
      return true
    }
    let privateDepIdx = await this.findOne(
      {
        id: {$in: idxDeps},
        belongs_id: {$ne: db.Sequelize.col('id')}
      },
      {raw: true, transaction})
    return !privateDepIdx
  }
  
}
