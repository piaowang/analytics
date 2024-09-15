import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoLiveScreenSnapshot = sequelize.define('SugoLiveScreenSnapshot',
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
      publish_at: {
        type: dataTypes.DATE,
        comment: '发布时间'
      },
      validity_period: {
        type: dataTypes.INTEGER,
        comment: '有效期(天)'
      },
      view_password: {
        type: dataTypes.STRING(50),
        comment: '查看密码'
      }
    },
    {
      tableName: 'sugo_livescreen_snapshot',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoLiveScreenSnapshot.belongsTo(models.UploadedFiles, {foreignKey: 'background_image_id'})
        SugoLiveScreenSnapshot.belongsTo(models.UploadedFiles, {foreignKey: 'cover_image_id'})
        SugoLiveScreenSnapshot.hasMany(models.SugoLiveScreenSnapshotComponent, {foreignKey: 'screen_id', as: 'components'})
      }
    }
  )
  return SugoLiveScreenSnapshot
}
