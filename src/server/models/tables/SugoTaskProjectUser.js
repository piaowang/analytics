import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  let sugoTaskProjectUser = sequelize.define('SugoTaskProjectUser', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    user_id: {
      type: dataTypes.STRING(50),
      comment: '用户id',
      references: {
        model: 'sugo_user',
        key: 'id'
      }
    },
    task_project_id: {
      type: dataTypes.STRING(32),
      comment: '所属项目',
      references: {
        model: 'sugo_task_project',
        key: 'id'
      }
    },
    role_type: {
      type: dataTypes.INTEGER
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
    tableName: 'sugo_task_project_user',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      sugoTaskProjectUser.belongsTo(models.SugoUser, { foreignKey: 'user_id' })
      sugoTaskProjectUser.belongsTo(models.SugoTaskProject, { foreignKey: 'task_project_id' })
    }
  })
  return sugoTaskProjectUser
}
