import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoLivefeeds = sequelize.define('SugoLivefeeds',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      title: {
        type: dataTypes.STRING
      },
      description: {
        type: dataTypes.STRING
      },
      params: {
        type: dataTypes.JSONB,
        comment: '实时大屏实例的配置，pane_slice_mapping, ...',
        defaultValue: {}
      },
      is_template: {
        type: dataTypes.BOOLEAN,
        comment: '是否模版',
        defaultValue: false
      },
      cover_image_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'uploaded_files',
          key: 'id'
        }
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
      tableName: 'sugo_livefeeds',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoLivefeeds.belongsTo(models.UploadedFiles, {foreignKey: 'cover_image_id'})
      }
    }
  )
  return SugoLivefeeds
}
