import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  let sugoTask = sequelize.define('SugoTaskProps', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(100),
      comment: '属性名称'
    },
    value: {
      type: dataTypes.STRING(250),
      comment: '属性值'
    },
    company_id: {
      type: dataTypes.STRING(32)
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'sugo_task_props',
    timestamps: true,
    underscored: true
  })
  return sugoTask
}
