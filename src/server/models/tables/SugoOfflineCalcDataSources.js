import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoOfflineCalcDataSources = sequelize.define('SugoOfflineCalcDataSources',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate,
        comment: '唯一标识'
      },
      name: {
        type: dataTypes.STRING(32),
        comment: '数据源中文名称',
        allowNull: false
      },
      type: {
        type: dataTypes.INTEGER,
        comment: '数据源类型（0=Druid，1=MySQL）',
        defaultValue: 0,
        allowNull: false
      },
      connection_params: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '数据源连接参数',
        allowNull: false
      },
      tags: {
        type: dataTypes.JSONB,
        defaultValue: [],
        comment: '分类信息',
        allowNull: false
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '额外参数',
        allowNull: false
      },
      supervisor_id: {
        type: dataTypes.STRING(32),
        comment: '负责人',
        allowNull: true,
        references: {
          model: 'sugo_user',
          key: 'id'
        }
      },
      description: {
        type: dataTypes.STRING,
        comment: '业务口径'
      },
      created_by: {
        type: dataTypes.STRING(32),
        allowNull: false
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      company_id: {
        type: dataTypes.STRING(32),
        allowNull: false,
        references: {
          model: 'sugo_company',
          key: 'id'
        }
      }
    },
    {
      tableName: 'sugo_offline_calc_datasources',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoOfflineCalcDataSources.hasMany(models.SugoOfflineCalcDimensions, {foreignKey: 'data_source_id'})
        SugoOfflineCalcDataSources.hasMany(models.SugoOfflineCalcIndices, {foreignKey: 'data_source_id'})
      }
    }
  )
  return SugoOfflineCalcDataSources
}
