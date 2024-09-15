import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const sugoBusinessDbSetting = sequelize.define('SugoBusinessDbSetting',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      table_title: {
        type: dataTypes.STRING(50)
      },
      db_type: {
        type: dataTypes.STRING(50)
      },
      db_jdbc: {
        type: dataTypes.STRING(250)
      },
      table_name: {
        type: dataTypes.STRING(50)
      },
      db_user: {
        type: dataTypes.STRING(50)
      },
      db_pwd: {
        type: dataTypes.STRING(250)
      },
      db_key: {
        type: dataTypes.STRING(50)
      },
      dimension: {
        type: dataTypes.STRING(50)
      },
      state: {
        type: dataTypes.INTEGER
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      project_id: {
        type: dataTypes.STRING(50)
      },
      company_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_business_db_setting',
      timestamps: true,
      underscored: true
    }
  )
  return sugoBusinessDbSetting
}
