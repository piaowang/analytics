
import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoVersionHistories = sequelize.define('SugoVersionHistories',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate,
        comment: '唯一标识'
      },
      base_version_id: {
        type: dataTypes.STRING(32),
        comment: '基于哪个版本做出的修改',
        references: {
          model: 'sugo_version_histories',
          key: 'id'
        }
      },
      target_id: {
        type: dataTypes.STRING(32),
        comment: '将要基于谁产生(修改)记录',
        allowNull: false
      },
      target_type: {
        type: dataTypes.INTEGER,
        comment: '版本主体类型（0=数据源，1=维度，2=指标，3=指标模型）',
        allowNull: false,
        defaultValue: 0
      },
      version: {
        type: dataTypes.STRING(32),
        allowNull: false,
        comment: '版本号'
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '状态（1=待审核，2=审核通过，3=审核不通过, 4=待删除, 5=已删除, 6=发起人取消）',
        allowNull: false,
        defaultValue: 0
      },
      clone: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '版本变更，是数据库记录的 delta',
        allowNull: false
      },
      review_status: {
        type: dataTypes.JSONB,
        defaultValue: {
          status: [],
          reviewer_list: {
            list: [],
            strategy: ''
          }
        },
        comment: '多个审核人的审核情况[{ user_id: HJbUk2NRg, status: 1}] 2:审核通过 3审核不通过',
        allowNull: false
      },
      comments: {
        type: dataTypes.JSONB,
        defaultValue: {reviewer: [], releaser: []},
        comment: '评论',
        allowNull: false
      },
      created_by: {
        type: dataTypes.STRING(32)
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
      tableName: 'sugo_version_histories',
      timestamps: true,
      underscored: true
      // associate: function (models) {
      //   SugoVersionHistories.hasMany(models.SugoOfflineCalcDimensions, {foreignKey: 'version_id'})
      //   SugoVersionHistories.hasMany(models.SugoOfflineCalcDimensions, {foreignKey: 'base_version_id'})
      //   SugoVersionHistories.hasMany(models.SugoOfflineCalcIndices, {foreignKey: 'version_id'})
      //   SugoVersionHistories.hasMany(models.SugoOfflineCalcIndices, {foreignKey: 'base_version_id'})
      //   SugoVersionHistories.hasMany(models.SugoOfflineCalcModels, {foreignKey: 'version_id'})
      //   SugoVersionHistories.hasMany(models.SugoOfflineCalcModels, {foreignKey: 'base_version_id'})
      // }
    }
  )
  return SugoVersionHistories
}
