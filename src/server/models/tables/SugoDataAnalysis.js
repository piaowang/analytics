/**
 * 表名  ： sugo_data_analysis
 * 实例名： SugoDataAnalysis
 * @description 数据接入记录表定义与说明
 *
 * 与ProjectModel相关联
 * 一个项目的数据来源可以有多种方式，包括：
 * + sdk接入，包括web\android\ios
 * + 文件接入，包括csv\text\excel
 * + 数据库接入
 *
 * 每种数据接入时都在此表创建一条记录
 */

/**
 * DataAnalysis 结构定义
 * @typedef {Object} DataAnalysisModel
 * @property {String} id
 * @property {String} name - 接入名称
 * @property {Number} type - 接入类型，主表或维表接入。参见下方AccessDataTableType
 * @property {String} package_name - 预留字段
 * @property {Number} access_type - 接入数据类型。参见下方AccessDataOriginalType
 * @property {String} project_id - 该条记录所属的项目
 * @property {Number} status - 接入状态 - sdk接入时默认为 ProjectState.Disable，sdk安装成功后，会更新该值为ProjectState.Activate
 * @property {Object} params - 保存接入参数，JSONB类型
 * @property {String} created_by - 创建人
 * @property {String} updated_by - 最后一次更新人
 * @property {Boolean} auto_track_init - 是否开启自动更新
 * @property {String} created_at - 创建时间
 * @property {String} updated_at - 最后一次更新时间
 */

/**
 * Project表关联及引用定义
 * @see {ProjectModel} - project_id
 * @see {AccessDataTableType} - type
 * @see {AccessDataOriginalType} - access_type
 * @see {ProjectState} - status
 */

import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoDataAnalysis = sequelize.define('SugoDataAnalysis', {
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
      allowNull: true,
      defaultValue: 0
    },
    package_name: {
      type: dataTypes.STRING,
      allowNull: true
    },
    access_type: {
      type: dataTypes.INTEGER,
      allowNull: true,
      comment: '0=android; 1=iOS; 2=Web; 3=Mysql; 4=Csv; 5=Text; 6=Excel'
    },
    project_id: {
      type: dataTypes.STRING,
      allowNull: true,
      references: {
        model: 'sugo_projects',
        key: 'id'
      }
    },
    status: {
      type: dataTypes.INTEGER,
      allowNull: true
    },
    params: {
      type: dataTypes.JSON,
      allowNull: true
    },
    created_by: {
      type: dataTypes.STRING,
      allowNull: true
    },
    updated_by: {
      type: dataTypes.STRING,
      allowNull: true
    },
    sdk_init: {
      type: dataTypes.BOOLEAN
    },
    auto_track_init: {
      type: dataTypes.BOOLEAN,
      default: false,
      allowNull: true,
      comment: '是否开启全埋点模式'
    },
    sdk_force_update_config: {
      type: dataTypes.BOOLEAN
    }
  }, {
    tableName: 'sugo_data_analysis',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    associate: function (models) {
      SugoDataAnalysis.hasMany(models.TrackEventDraft, { foreignKey: 'appid', targetKey: 'id' })
      SugoDataAnalysis.hasMany(models.AppVersion, { foreignKey: 'appid', targetKey: 'id' })
    }
  })
  return SugoDataAnalysis
}
