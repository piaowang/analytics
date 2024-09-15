import { BaseService } from './base.service'
import TrackPageV3Service from '../services/sugo-track-page-v3.service'
import _ from 'lodash'

export default class SugoSDKPageInfoService extends BaseService {

  static instance = null

  constructor() {
    super('SugoSDKPageInfoDraft')
  }

  static getInstance() {
    if (SugoSDKPageInfoService.instance === null) {
      SugoSDKPageInfoService.instance = new SugoSDKPageInfoService()
    }
    return SugoSDKPageInfoService.instance
  }

  /**
  * 部署页面
  * @param {*} maxKeepVersion 保留最大版本号
  * @param {*} token appid
  * @param {*} appVersion APP版本
  * @param {*} eventBindingsVersion 最新发布版本
  * @param {*} transaction 事务
  */
  async deployPage(maxKeepVersion, token, appVersion, eventBindingsVersion, transaction) {
    // 获取草稿的埋点信息
    const rows = await this.getDBInstance().findAll({
      where: {
        appid: token,
        app_version: appVersion
      },
      raw: true
    })
    // 遍历处理数据 增加版本号和事件版本
    const trackEvents = rows.map(row => {
      return { ..._.omit(row, ['id']), event_bindings_version: eventBindingsVersion }
    })
    if (trackEvents.length) {
      await this.getDBInstance().bulkCreate(trackEvents, { transaction })
    }

    // 获取事件已经绑定的版本号
    const bindingVersions = await TrackPageV3Service.getInstance().findAll(
      {
        where: { appid: token, app_version: appVersion },
        transaction,
        attributes: ['event_bindings_version'],
        raw: true,
        group: 'event_bindings_version',
        order: [['event_bindings_version', 'ASC']]
      }
    )

    // 删除保留版本
    let deleteVersion = bindingVersions.length > maxKeepVersion
      ? _.get(bindingVersions, '0.event_bindings_version', '')
      : ''
    if (deleteVersion) {
      await TrackPageV3Service.getInstance().destroy(
        {
          where: { appid: token, app_version: appVersion, event_bindings_version: deleteVersion },
          transaction
        }
      )
    }
  }
}
