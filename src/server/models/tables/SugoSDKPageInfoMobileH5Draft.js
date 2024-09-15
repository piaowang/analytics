/**
 * 表名  ： sugo_sdk_page_info_mobile_h5_draft
 * 实例名： SDKPageInfoMobileH5Draft
 * @description 移动端共同使用的h5埋点埋点页面信息草稿表
 */

/**
 * SDKPageInfoDraft 表定义
 * @typedef {Object} SDKPageInfoMobileH5Draft
 * @property {string} id
 * @property {string} project_id
 * @property {string} appid
 * @property {string} page
 * @property {string} page_name
 * @property {string} code
 * @property {boolean} similar
 * @property {string} category
 * @property {string} created_on
 * @property {string} changed_on
 */

/**
 * User 表关联及引用度定义
 * @see {DataAnalysisModel.id} - appid
 */

import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoSDKPageInfoMobileH5Draft = sequelize.define(
    'SugoSDKPageInfoMobileH5Draft',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      project_id: {
        type: dataTypes.STRING(50)
      },
      appid: {
        type: dataTypes.STRING(32)
      },
      page: {
        type: dataTypes.STRING(500)
      },
      page_name: {
        type: dataTypes.STRING(255)
      },
      code: {
        type: dataTypes.TEXT
      },
      similar: {
        type: dataTypes.BOOLEAN
      },
      category: {
        type: dataTypes.TEXT
      },
      is_submit_point: {
        type: dataTypes.BOOLEAN
      }
    },
    {
      tableName: 'sugo_sdk_page_info_mobile_h5_draft',
      timestamps: true,
      underscored: true,
      createdAt: 'created_on',
      updatedAt: 'changed_on'
    }
  )
  return SugoSDKPageInfoMobileH5Draft
}
