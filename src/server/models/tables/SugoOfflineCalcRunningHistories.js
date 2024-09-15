import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoOfflineCalcRunningHistories = sequelize.define('SugoOfflineCalcRunningHistories',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate,
        comment: '唯一标识'
      },
      model_id: {
        type: dataTypes.STRING(32),
        comment: '所属指标模型 ID',
        allowNull: false,
        references: {
          model: 'sugo_offline_calc_models',
          key: 'id'
        }
      },
      executionId: {
        field: 'executionId',
        type: dataTypes.STRING(32),
        comment: '执行编号'
      },
      task_name: {
        type: dataTypes.STRING(32),
        comment: '任务名称'
      },
      runner: {
        type: dataTypes.STRING(32),
        comment: '执行器',
        allowNull: false
      },
      starts_at: {
        type: dataTypes.DATE,
        comment: '开始时间',
        allowNull: false
      },
      ends_at: {
        type: dataTypes.DATE,
        comment: '结束时间',
        allowNull: true
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '执行状态（0=失败，1=成功）',
        allowNull: true
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '额外信息',
        allowNull: false
      },
      description: {
        type: dataTypes.STRING,
        comment: '备注'
      }
    },
    {
      tableName: 'sugo_offline_calc_running_histories',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoOfflineCalcRunningHistories.belongsTo(models.SugoOfflineCalcModels, {foreignKey: 'model_id'})
      }
    }
  )
  return SugoOfflineCalcRunningHistories
}
