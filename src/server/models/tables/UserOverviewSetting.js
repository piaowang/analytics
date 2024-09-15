/**
 * 表名  ： sugo_user_overview_setting
 * 实例名： SugoUserOverviewSetting
 * @description 概览布局
 */

/**
 * 概览布局表定义
 * @typedef {Object} SugoUserOverviewSetting
 * @property {string} id
 * @property {string} user_id
 * @property {string} datasource_id
 * @property {array} layouts
 * @property {string} company_id
 */

/**
 * User 表关联及引用度定义
 * @see {CompanyModel.id} - company_id
 */

import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoUserOverviewSetting = sequelize.define('SugoUserOverviewSetting',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      user_id: {
        type: dataTypes.STRING(32)
      },
      datasource_id: {
        type: dataTypes.STRING(32)
      },
      layouts: {
        type: dataTypes.JSONB,
        comment: '概览布局',
        defaultValue: []
      },
      company_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_user_overview_setting',
      timestamps: true,
      underscored: true
    }
  )
  return SugoUserOverviewSetting
}
