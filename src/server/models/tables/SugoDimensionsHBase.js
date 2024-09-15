/**
 * 表名  ： sugo_dimensions_hbase
 * 实例名： SugoDimensionsHBase
 * @deprecated 该表已废弃，不再更新
 * @description 保存不同数据接入类型的维度
 *
 * 与 DataAnalysisModel 相关联，每种数据接入时都有对应的维度
 * 其中，文件接与数据库接入的维度需要保存
 */

/**
 * DataAnalysis 结构定义
 * @typedef {Object} DimensionsHBaseModel
 * @property {String} id
 * @property {String} name - 维度名
 * @property {Number} type - 维度类型
 * @property {String} analysis_id - DataAnalysisModel 表中的id
 * @property {String} created_at - 创建时间
 * @property {String} updated_at - 最后一次更新时间
 */

/**
 * DimensionsHBaseModel表关联及引用定义
 * @see {DataAnalysisModel} - analysis_id
 * @see {DIMENSION_TYPES} - type
 */

import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  return sequelize.define('SugoDimensionsHBase', {
    id: {
      type: dataTypes.STRING,
      allowNull: false,
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING,
      allowNull: true
    },
    type: {
      type: dataTypes.INTEGER,
      allowNull: true
    },
    analysis_id: {
      type: dataTypes.STRING,
      allowNull: true,
      references: {
        model: 'sugo_data_analysis',
        key: 'id'
      }
    }
  }, {
    tableName: 'sugo_dimensions_hbase',
    freezeTableName: true,
    underscored: true,
    timestamps: false
  })
}
