/**
 * 表名  ： tag_type
 * 实例名： TagType
 * @description 项目表定义与说明
 */

/**
 * TagType表定义
 * @typedef {Object} TagTypeModel
 * @property {String} id
 * @property {String} type - 一级分类名称
 * @property {String} datasource_id - 项目关联数据源表(DataSourceModel)的id
 * @property {String} dimension_id - 维度id或者组合标签id
 * @property {String} company_id - 项目所属公司名
 * @property {String} tag_tree_id - 标签分类id
 * @property {String} created_at - 创建时间
 * @property {String} updated_at - 更新时间
 * @property {String} created_by - 由谁创建
 * @property {String} updated_by - 更新记录
 */

import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const TagType = sequelize.define('TagType', {
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
    type: {
      type: dataTypes.STRING(200)
    },
    datasource_id: {
      type: dataTypes.STRING(32),
      references: {
        model: 'sugo_datasources',
        key: 'id'
      }
    },
    dimension_id: {
      type: dataTypes.STRING(100)
    },
    company_id: {
      type: dataTypes.STRING(32)
    },
    tag_tree_id: {
      type: dataTypes.STRING(32),
      comment: '标签分类ID'
    }
  }, {
    tableName: 'tag_type',
    timestamps: true,
    underscored: true,
    associate (models) {
      TagType.belongsTo(
        models.SugoDatasources,
        { foreignKey: 'datasource_id' }
      )
    }
  })
  return TagType
}
