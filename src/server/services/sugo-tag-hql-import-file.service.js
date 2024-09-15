import { BaseService } from './base.service'
import GlobalConfigService from '../services/sugo-global-config.service'
import moment from 'moment'
import UploadedFilesSvc from '../services/uploaded-files.service'
import _ from 'lodash'
import RedisSchedule from './redis-schedule.service'

export default class SugoTagHqlImportFileService extends BaseService {
  constructor() {
    super('SugoTagHqlImportFile')
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new SugoTagHqlImportFileService()
    }
    return this._instance
  }

  cleanHqlImportFile = async () => {
    debug('开始定期清除标签临时文件 任务')
    let clearConfig = await GlobalConfigService.getInstance().findOne({ key: 'hqlImportFileClearConfig' })
    clearConfig = _.get(clearConfig, 'value')
    if (clearConfig) {
      let res = await SugoTagHqlImportFileService.getInstance().findAll({
        created_at: {
          $lte: moment().add(-clearConfig, 'M').toDate()
        },
        state: 1
      }, {
        attributes: ['id', 'file_name'],
        raw: true
      })
      for (let i = 0; i < res.length; i++) {
        debug(`删除标签临时文件 ${res[i].file_name}[${res[i].id}]`)
        await UploadedFilesSvc.deleteById(res[i].id)
        await SugoTagHqlImportFileService.getInstance().update({ state: 0 }, { id: res[i].id })
      }
    }
    debug('完成定期清除标签临时文件 任务')
  }
}


export function initCleanHqlImportFile() {
  const sugoTagHqlImportFileService = SugoTagHqlImportFileService.getInstance()
  let redisSchedule =  RedisSchedule.getInstance()
  // PM2 cluster模式只启动一次定时任务
  const clusterId = process.env.NODE_APP_INSTANCE || 0
  // clusterId is string
  if (Number(clusterId) === 0) {
    redisSchedule.addJob('clean-up-hql-import-file', {
      every: '1 day',
      path: './sugo-tag-hql-import-file.service',
      func: 'cleanHqlImportFile',
      data: null,
      counter: 0
    }).then(() => {
      sugoTagHqlImportFileService.cleanHqlImportFile()
    })
  }
}
