import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoLiveScreen = sequelize.define('SugoLiveScreen',
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
      authorize_to: {
        type: dataTypes.JSON,
        comment: '授权给某些人'
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '大屏的状态,0: 在回收站中',
        defaultValue: 1
      },
      cover_mode: {
        type: dataTypes.INTEGER,
        comment: '封面图是自动创建还是手动上传， 2：手动上传，1：跟随大屏实时截取微缩图',
        defaultValue: 1
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
      }
    },
    {
      tableName: 'sugo_livescreen',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoLiveScreen.belongsTo(models.UploadedFiles, {foreignKey: 'background_image_id'})
        SugoLiveScreen.belongsTo(models.UploadedFiles, {foreignKey: 'cover_image_id'})
        SugoLiveScreen.hasMany(models.SugoLiveScreenComponent, {foreignKey: 'screen_id', as: 'components'})
      }
    }
  )
  return SugoLiveScreen
}
