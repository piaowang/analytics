import { generate } from 'shortid'

/**
 * 联系人部门表
 */
export default (sequelize, dataTypes) => {
  return sequelize.define('SugoDepartments', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    parent_id: {
      type: dataTypes.STRING(32)
    },
    name: {
      type: dataTypes.STRING(50),
      comment: '部门名称',
      unique: true
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    },
    company_id: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'sugo_departments', // southern_departments
    timestamps: true,
    underscored: true
  })
}
