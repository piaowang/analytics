import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  let sugoTask = sequelize.define('SugoTask', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(50),
      comment: '任务名称'
    },
    status: {
      type: dataTypes.STRING(50),
      comment: '审核状态 0=未提审 1=待审核 2=通过在运行 3=暂停'
    },
    task_project_id: {
      type: dataTypes.STRING(32),
      comment: '所属项目',
      references: {
        model: 'sugo_task_project',
        key: 'id'
      }
    },
    task_group_id: {
      type: dataTypes.STRING(32)
    },
    category_id: {
      type: dataTypes.STRING(32),
      comment: '所属分类',
      references: {
        model: 'sugo_task_category',
        key: 'id'
      }
    },
    params: {
      type: dataTypes.JSON
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
    tableName: 'sugo_task',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      sugoTask.belongsTo(models.SugoTaskCategory, { foreignKey: 'category_id' })
      sugoTask.belongsTo(models.SugoTaskProject, { foreignKey: 'task_project_id' })
    }
  })
  return sugoTask
}
