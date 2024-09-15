import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  let sugoTaskGroup = sequelize.define('SugoTaskGroup', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(50),
      comment: '任务组名称'
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
    params: {
      type: dataTypes.JSON
    },
    category_id: {
      type: dataTypes.STRING(32),
      comment: '所属分类',
      references: {
        model: 'sugo_task_group_category',
        key: 'id'
      }
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
    tableName: 'sugo_task_group',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      sugoTaskGroup.belongsTo(models.SugoTaskGroupCategory, { foreignKey: 'category_id' })
      sugoTaskGroup.belongsTo(models.SugoTaskProject, { foreignKey: 'task_project_id' })
    }
  })
  return sugoTaskGroup
}
