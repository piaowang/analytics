import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoDataApis = sequelize.define('SugoDataApis',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(50),
        allowNull: false
      },
      description: {
        type: dataTypes.STRING
      },
      call_path: {
        type: dataTypes.STRING, // 实际查询地址：`/data-api/${call_path}`
        allowNull: false
      },
      type: {
        type: dataTypes.INTEGER, // 详细见 DataApiTypeEnum
        defaultValue: 0,
        allowNull: false
      },
      status: {
        type: dataTypes.INTEGER, // 详细见 DataApiStatusEnum
        defaultValue: 1,
        allowNull: false
      },
      accessible_clients: {
        type: dataTypes.JSONB,
        defaultValue: ['*']
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {} // 保存单图的筛选条件
      },
      tags: {
        type: dataTypes.JSONB,
        defaultValue: []
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
      tableName: 'sugo_data_apis',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        // UploadedFiles.hasMany(models.SugoLossPredictModels, {foreignKey: 'training_file_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoDataApis
}
