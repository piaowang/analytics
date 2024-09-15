
import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const Meta = sequelize.define('ResetPassword',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      user_id: {
        type: dataTypes.STRING(32)
      },
      expire: {
        type: dataTypes.DATE
      }
    },
    {
      tableName: 'reset_password',
      timestamps: true,
      underscored: true
    }
  )
  return Meta
}
