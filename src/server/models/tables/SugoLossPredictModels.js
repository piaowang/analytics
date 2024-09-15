import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoLossPredictModels = sequelize.define('SugoLossPredictModels',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(255)
      },
      training_file_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'uploaded_files',
          key: 'id'
        }
      },
      training_settings: {
        type: dataTypes.JSONB,
        comment: '训练数据的配置',
        defaultValue: {}
      },
      model_info: {
        type: dataTypes.JSONB,
        comment: '模型的数据',
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
      tableName: 'sugo_loss_predict_models',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoLossPredictModels.belongsTo(models.UploadedFiles, {foreignKey: 'training_file_id'})
        SugoLossPredictModels.hasMany(models.SugoLossPredictPredictions, {foreignKey: 'by_model_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoLossPredictModels
}
