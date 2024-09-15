import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const apiResultLog = sequelize.define('ApiResultLog',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      path: {
        type: dataTypes.STRING(100)
      },
      method: {
        type: dataTypes.STRING(6)
      },
      status: {
        type: dataTypes.INTEGER
      },
      log_time: {
        type: dataTypes.DATE
      },
      count: {
        type: dataTypes.INTEGER
      }
    },
    {
      tableName: 'sugo_api_result_log',
      timestamps: true,
      underscored: true
    }
  )
  return apiResultLog
}
