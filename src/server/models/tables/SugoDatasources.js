/**
 * @typedef {Object} DataSourceModel
 * @property {String} id
 * @property {String} name
 * @property {String} tag_datasource_name - 标签数据源名
 * @property {String} tag_task_id - 标签数据源task id
 * @property {String} title
 * @property {String} description
 * @property {Number} status
 * @property {Number} peak
 * @property {DataSourceType} type
 * @property {String} taskId
 * @property {Object} params
 * @property {String} supervisorPath
 * @property {Object} supervisorJson
 * @property {Array<String>} user_ids
 * @property {Array<String>} role_ids
 * @property {String} created_by
 * @property {String} updated_by
 * @property {String} company_id
 * @property {String} access_type
 * @property {String} created_at
 * @property {String} updated_at
 */

import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoDatasources = sequelize.define('SugoDatasources', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(50),
      validate: {
        is: /^[A-Za-z][\w\-]{1,49}$/i // 可用字母、数字、点、下划线、$，但必须以字母开头，长度为4至50位
      },
      comment: '数据源名称'
    },
    tag_datasource_name: {
      type: dataTypes.STRING(50),
      validate: {
        is: /^[A-Za-z][\w\-]{1,49}$/i // 可用字母、数字、点、下划线、$，但必须以字母开头，长度为4至50位
      },
      comment: '标签数据源名称'
    },
    title: {
      type: dataTypes.STRING(50),
      comment: '数据源别名'
    },
    description: {
      type: dataTypes.STRING(500),
      comment: '数据源描述备注'
    },
    status: {
      type: dataTypes.INTEGER,
      defaultValue: 0,
      comment: '数据源是否激活0=待创建;1=创建成功'
    },
    peak: {
      type: dataTypes.DECIMAL,
      comment: '数据源导入最高峰值数值'
    },
    type: {
      type: dataTypes.INTEGER,
      defaultValue: 0,
      comment: '数据源类型: 0=原数据(Tindex);1=聚合数据(Druid);2=标签数据(Uindex);3=MySQL表查询'
    },
    taskId: {
      type: dataTypes.STRING(100),
      comment: 'druid taskId'
    },
    tag_task_id: {
      type: dataTypes.STRING(100),
      comment: 'druid taskId 标签数据'
    },
    params: {
      type: dataTypes.JSONB,
      comment: '数据源特定的配置，funnelDimensions: [], funnelMetric: ...',
      defaultValue: {}
    },
    supervisorPath: {
      type: dataTypes.STRING(500),
      comment: 'druid supervisor 文件 path'
    },
    supervisorJson: {
      type: dataTypes.JSONB,
      comment: 'druid supervisor json 文件内容',
      defaultValue: {}
    },
    user_ids: {
      type: dataTypes.JSONB,
      defaultValue: []
    },
    role_ids: {
      type: dataTypes.JSONB,
      defaultValue: []
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    },
    company_id: {
      type: dataTypes.STRING(32)
    },
    access_type: {
      type: dataTypes.ENUM('single', 'mysql', 'android', 'csv', 'json'),
      defaultValue: 'android'
    }
  },
  {
    tableName: 'sugo_datasources',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    associate: function (models) {
      SugoDatasources.hasMany(models.SugoDimensions, {foreignKey: 'parentId', targetKey: 'id'})
      SugoDatasources.hasMany(models.SugoMeasures, {foreignKey: 'parentId', targetKey: 'id'})
      SugoDatasources.hasMany(models.Slices, {foreignKey: 'druid_datasource_id'})
      SugoDatasources.hasMany(models.SugoFunnels, {foreignKey: 'druid_datasource_id'})
      SugoDatasources.hasMany(models.SugoTrafficAnalyticModels, {foreignKey: 'druid_datasource_id'})
    }
  }
  )
  return SugoDatasources
}
