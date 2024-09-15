/**
 * 表名  ： tag_group
 * 实例名： TagGroup
 * @description 项目表定义与说明
 */

/**
 * TagGroup表定义
 * @typedef {Object} TagGroupModel
 * @property {String} id
 * @property {String} title - 名称
 * @property {String} description - 描述
 * @property {Object} params - 条件定义
 * @property {String} datasource_id - 项目关联数据源表(DataSourceModel)的id
 * @property {String} company_id - 项目所属公司名
 * @property {String} created_at - 创建时间
 * @property {String} updated_at - 更新时间
 * @property {String} created_by - 由谁创建
 * @property {String} updated_by - 更新记录
 */

import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const TagGroup = sequelize.define('TagGroup', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    },
    title: {
      type: dataTypes.STRING(100)
    },
    status: {
      type: dataTypes.INTEGER
    },
    description: {
      type: dataTypes.STRING(500)
    },
    datasource_id: {
      type: dataTypes.STRING(32),
      references: {
        model: 'sugo_datasources',
        key: 'id'
      }
    },
    params: {
      type: dataTypes.JSONB,
      defaultValue: {filters:[]}
    },
    role_ids: {
      type: dataTypes.JSONB,
      defaultValue: []
    },
    company_id: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'tag_group',
    timestamps: true,
    underscored: true,
    associate (models) {
      TagGroup.belongsTo(
        models.SugoDatasources,
        { foreignKey: 'datasource_id' }
      )
    }
  })
  return TagGroup
}
