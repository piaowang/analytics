import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoDataApiClients = sequelize.define('SugoDataApiClients',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(32),
        allowNull: false
      },
      app_id: {
        type: dataTypes.STRING(32), // safeId
        allowNull: false
      },
      app_key: {
        type: dataTypes.STRING(32),
        allowNull: false
      },
      status: {
        type: dataTypes.INTEGER, // 详细见 DataApiClientStatusEnum
        defaultValue: 1,
        allowNull: false
      },
      access_token: {
        type: dataTypes.STRING(32) // appId-RandomSafeId 带上 appKey 是为了方便从调用日志中知道是那个 client 调用的
      },
      access_token_expire_at: {
        type: dataTypes.DATE
      },
      refresh_token: {
        type: dataTypes.STRING(32) // same as current access_token
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
        allowNull: false
      }
    },
    {
      tableName: 'sugo_data_api_clients',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        // UploadedFiles.hasMany(models.SugoLossPredictModels, {foreignKey: 'training_file_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoDataApiClients
}
