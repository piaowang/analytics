import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoLossPredictPredictions = sequelize.define('SugoLossPredictPredictions',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      by_model_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_loss_predict_models',
          key: 'id'
        }
      },
      test_file_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'uploaded_files',
          key: 'id'
        }
      },
      test_settings: {
        type: dataTypes.JSONB,
        comment: '测试数据的配置',
        defaultValue: {}
      },
      prediction_info: {
        type: dataTypes.JSONB,
        comment: '预测结果数据',
        defaultValue: {}
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
      tableName: 'sugo_loss_predict_predictions',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoLossPredictPredictions.belongsTo(models.UploadedFiles, {foreignKey: 'test_file_id'})
        SugoLossPredictPredictions.belongsTo(models.SugoLossPredictModels, {foreignKey: 'by_model_id'})
      }
    }
  )
  return SugoLossPredictPredictions
}
