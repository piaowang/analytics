/**
 * 表名  ： segment
 * 实例名： Segment
 * @description 用户分群表定义与说明
 */

/**
 * Segment表定义
 * @typedef {Object} SegmentModel
 * @property {string} id
 * @property {string} created_by
 * @property {string} updated_by
 * @property {string} title - 名称
 * @property {string} druid_datasource_id
 * @property {string} datasource_name
 * @property {Object} params
 * @property {Array} tags
 * @property {string} description - 备注
 * @property {string} company_id
 */

/**
 * Segment表关联及引用度定义
 * @see {DataSourceModel.id} - druid_datasource_id
 * @see {DataSourceModel.name} - datasource_name
 * @see {CompanyModel.id} - company_id
 */

import sid from '../safe-id'

export default (sequelize, dataTypes) => {
  const Segment = sequelize.define('Segment', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: sid
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    },
    title: {
      type: dataTypes.STRING(200)
    },
    druid_datasource_id: {
      type: dataTypes.STRING(32),
      references: {
        model: 'sugo_datasources',
        key: 'id'
      }
    },
    datasource_name: {
      type: dataTypes.STRING(200)
    },
    params: {
      type: dataTypes.JSONB,
      defaultValue: {}
    },
    tags: {
      type: dataTypes.JSONB,
      defaultValue: []
    },
    description: {
      type: dataTypes.STRING(500)
    },
    company_id: {
      type: dataTypes.STRING(32)
    },
    compute_time: {
      type: dataTypes.DATE
    }
  }, {
    tableName: 'segment',
    timestamps: true,
    underscored: true,
    associate (models) {
      Segment.belongsTo(models.SugoUser, {
        foreignKey: 'created_by'
      })
      Segment.belongsTo(models.SugoDatasources, { foreignKey: 'druid_datasource_id' })
      Segment.hasMany(models.SegmentWIthMarketingScene, { foreignKey: 'segment_id' })
    }
  })
  return Segment
}
