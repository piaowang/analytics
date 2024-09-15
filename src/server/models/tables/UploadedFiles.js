import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const UploadedFiles = sequelize.define('UploadedFiles',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING
      },
      type: {
        type: dataTypes.INTEGER,
        comment: 'livefeedBackground,...', // 详细见 UploadedFileType
        defaultValue: 0
      },
      path: {
        type: dataTypes.STRING
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
      tableName: 'uploaded_files',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        UploadedFiles.hasMany(models.SugoLivefeeds, {foreignKey: 'cover_image_id'})
        UploadedFiles.hasMany(models.SugoLossPredictModels, {foreignKey: 'training_file_id', onDelete: 'cascade', hooks: true})
        UploadedFiles.hasMany(models.SugoLossPredictPredictions, {foreignKey: 'test_file_id', onDelete: 'cascade', hooks: true})
        UploadedFiles.hasMany(models.SugoPortalPages, {foreignKey: 'background_image_id', onDelete: 'SET NULL', hooks: true})
      }
    }
  )
  return UploadedFiles
}
