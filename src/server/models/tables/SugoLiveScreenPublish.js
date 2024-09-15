import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoLivescreenPublish = sequelize.define('SugoLivescreenPublish',
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
      screen_width: {
        type: dataTypes.INTEGER
      },
      screen_height: {
        type: dataTypes.INTEGER
      },
      scale_mode: {
        type: dataTypes.ENUM('width-priority', 'heigth-priority', 'full-fill'),
        comment: '缩放方式',
        defaultValue: 'width-priority'
      },
      is_template: {
        type: dataTypes.BOOLEAN,
        comment: '是否模版',
        defaultValue: false
      },
      is_published: {
        type: dataTypes.BOOLEAN,
        comment: '是否发布',
        defaultValue: false
      },
      background_image_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'uploaded_files',
          key: 'id'
        }
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
      },
      category_id: {
        type: dataTypes.STRING(50)
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '大屏的状态,0: 在回收站中',
        defaultValue: 1
      },
    },
    {
      tableName: 'sugo_livescreen_publish',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoLivescreenPublish.belongsTo(models.UploadedFiles, { foreignKey: 'background_image_id' })
        SugoLivescreenPublish.belongsTo(models.UploadedFiles, { foreignKey: 'cover_image_id' })
        SugoLivescreenPublish.hasMany(models.SugoLivescreenPublishComponent, { foreignKey: 'screen_id', as: 'components' })
      }
    }
  )
  return SugoLivescreenPublish
}
