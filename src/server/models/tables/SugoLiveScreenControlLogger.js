import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoLiveScreenControlLogger = sequelize.define('SugoLiveScreenControlLogger',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      content: {
        type: dataTypes.STRING,
        comment: '操作内容'
      },
      opera_user: {
        type: dataTypes.STRING,
        comment: '操作人'
      },
      operate: {
        type: dataTypes.STRING,
        comment: '操作设置'
      }
    },
    {
      tableName: 'sugo_live_screen_control_logger',
      timestamps: true,
      underscored: true
    }
  )
  return SugoLiveScreenControlLogger
}
