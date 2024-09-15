import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  return sequelize.define('SugoTaskProject', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(50),
      comment: '项目名称'
    },
    description: {
      type: dataTypes.STRING(250),
      comment: '项目描述'
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
    tableName: 'sugo_task_project',
    timestamps: true,
    underscored: true
  })
}
