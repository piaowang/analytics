import db from '../models'
import _ from 'lodash'
import { defineTypes, PropTypes } from '../../common/checker'
import conf from '../config'

const sdkCommonH5 = conf.site.sdkCommonH5 || false // 当前是否将移动端的h5全部放在一个表中
export default class SugoSdkPageInfoService {
  /**
   * 删除相同版本的页面草稿
   */
  static async deleteAllSameVersionSdkPageInfoDraft(token, appVersion, target) {
    let total = 0 //操作条数
    const deleteSql = {
      where: {
        appid: token,
        app_version: appVersion
      },
      ...target
    }
    // 删除移动端h5共用的表格,使用project_id作为标识
    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({
        where: {
          id: token
        },
        raw: true
      })
      total = await db.SugoSDKPageInfoMobileH5Draft.destroy({
        where: {
          project_id: dim_inst.project_id
        },
        ...target
      })
    }
    total += await db.SugoSDKPageInfoDraft.destroy(deleteSql)
    return total
  }
  /**
   * 删除页面草稿
   */
  static async deleteSDKPageInfoDraft(pageInfoId) {
    let total = 0 //操作条数
    const deleteSql = {
      where: {
        id: pageInfoId
      }
    }
    // 删除移动端h5共用的表格
    if (sdkCommonH5) {
      total = await db.SugoSDKPageInfoMobileH5Draft.destroy(deleteSql)
    }
    total += await db.SugoSDKPageInfoDraft.destroy(deleteSql)
    return total
  }
}
