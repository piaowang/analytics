import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoOfflineCalcModels = sequelize.define('SugoOfflineCalcModels',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate,
        comment: '唯一标识'
      },
      belongs_id: {
        type: dataTypes.STRING(32),
        comment: '归属哪个公有版本',
        allowNull: true,
        references: {
          model: 'sugo_offline_calc_models',
          key: 'id'
        }
      },
      name: {
        type: dataTypes.STRING(64),
        comment: '指标模型英文名',
        allowNull: false
      },
      title: {
        type: dataTypes.STRING(32),
        comment: '指标模型别名',
        allowNull: true
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '额外设置，例如依赖的维度和指标、筛选和有效期',
        allowNull: false
      },
      tags: {
        type: dataTypes.JSONB,
        defaultValue: [],
        comment: '分类信息',
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
      tableName: 'sugo_offline_calc_models',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoOfflineCalcModels.hasMany(models.SugoOfflineCalcRunningHistories, {foreignKey: 'model_id'})
      }
    }
  )
  return SugoOfflineCalcModels
}
