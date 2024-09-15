import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoOfflineCalcReviewers = sequelize.define('SugoOfflineCalcReviewers',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate,
        comment: '唯一标识'
      },
      strategy: {
        type: dataTypes.INTEGER,
        allowNull: false,
        comment: '审核策略（0=依次，1=任意一个同意即可)'
      },
      target_type: {
        type: dataTypes.STRING(32),
        comment: '审核主体类型（0=维度，1=指标，2=指标模型)',
        allowNull: false,
        defaultValue: 0
      },
      reviewer_ids: {
        type: dataTypes.JSONB,
        allowNull: false,
        comment: '审核人，多个，值为 bySupervisor 时则表示由负责人审核'
      },
      description: {
        type: dataTypes.STRING(255),
        comment: '备注'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      company_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_offline_calc_reviewers',
      timestamps: true,
      underscored: true
    }
  )
  return SugoOfflineCalcReviewers
}
