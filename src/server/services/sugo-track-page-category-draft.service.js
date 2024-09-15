import { BaseService } from './base.service'
import TrackPageCategoryV3Service from './sugo-track-page-category.service'
import _ from 'lodash'


export default class SugoPageCategoriesDraftService extends BaseService {

  static instance = null

  constructor() {
    super('SDKPageCategoriesDraft')
  }

  static getInstance() {
    if (SugoPageCategoriesDraftService.instance === null) {
      SugoPageCategoriesDraftService.instance = new SugoPageCategoriesDraftService()
    }
    return SugoPageCategoriesDraftService.instance
  }
  
  async deployPage(token, appVersion, eventBindingsVersion, transaction) {
    // 获取草稿的埋点信息
    // 复制page_categories_draft到page_categories
    await TrackPageCategoryV3Service.getInstance().destroy(
      { appid: token, app_version: appVersion },
      { transaction }
    )

    const pageCategories = await this.getDBInstance().findAll(
      { appid: token, app_version: appVersion }, { raw: true }
    )

    if (pageCategories.length > 0) {
      const keys = ['name', 'appid', 'app_version', 'regulation']
      const categories = pageCategories.map(p => ({ ..._.pick(p, keys), event_bindings_version: eventBindingsVersion }))
      await TrackPageCategoryV3Service.getInstance().bulkCreate(categories, transaction)
    }
  }
}
