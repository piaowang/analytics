import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const DbConnectDbSetting = sequelize.define('TaskScheduleDbConnectSetting',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      db_alais: {
        type: dataTypes.STRING(50)
      },
      db_type: {
        type: dataTypes.STRING(50)
      },
      db_user: {
        type: dataTypes.STRING(50)
      },
      db_pwd: {
        type: dataTypes.STRING(250)
      },
      db_ip: {
        type: dataTypes.STRING(250)
      },
      db_port: {
        type: dataTypes.INTEGER
      },
      default_db: {
        type: dataTypes.STRING(250)
      },
      db_state: {
        type: dataTypes.INTEGER
      }
    },
    {
      tableName: 'sugo_task_schedule_db_connect_settings',
      timestamps: true,
      underscored: true
    }
  )
  return DbConnectDbSetting
}
