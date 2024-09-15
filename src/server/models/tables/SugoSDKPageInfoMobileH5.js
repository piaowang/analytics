/**
 * 表名  ： sugo_sdk_page_info_mobile_h5
 * 实例名： SugoSDKPageInfoMobileH5
 * @description 移动端共同使用的h5埋点页面信息表
 */

/**
 * SugoSDKPageInfoMobileH5 表定义
 * @typedef {Object} SDKPageInfoMobileH5Model
 * @property {string} id
 * @property {string} appid
 * @property {string} page
 * @property {string} project_id
 * @property {string} code
 * @property {boolean} similar
 * @property {string} category
 * @property {number} event_bindings_version
 * @property {string} created_on
 * @property {string} changed_on
 */

/**
 * User 表关联及引用度定义
 * @see {DataAnalysisModel.id} - appid
 */

import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoSDKPageInfoMobileH5 = sequelize.define(
    'SugoSDKPageInfoMobileH5',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      appid: {
        type: dataTypes.STRING(32)
      },
      project_id: {
        type: dataTypes.STRING(50)
      },
      page: {
        type: dataTypes.STRING(500)
      },
      page_name: {
        type: dataTypes.STRING(255)
      },
      event_bindings_version: {
        type: dataTypes.INTEGER
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
      tableName: 'sugo_sdk_page_info_mobile_h5',
      timestamps: true,
      underscored: true,
      createdAt: 'created_on',
      updatedAt: 'changed_on'
    }
  )
  return SugoSDKPageInfoMobileH5
}
