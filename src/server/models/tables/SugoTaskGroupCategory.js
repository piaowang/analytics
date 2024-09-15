import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  let sugoTaskGroupCategory = sequelize.define('SugoTaskGroupCategory', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    title: {
      type: dataTypes.STRING(50),
      comment: '工作流组的分类'
    },
    parent_id: {
      type: dataTypes.STRING(500),
      comment: '工作流组所属分类'
    },
    group_category_project_id: {
      type: dataTypes.STRING(32),
      comment: '所属项目',
      references: {
        model: 'sugo_task_project',
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
    tableName: 'sugo_task_group_category',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      sugoTaskGroupCategory.belongsTo(models.SugoTaskProject, {foreignKey: 'group_category_project_id'})
    }
  })
  return sugoTaskGroupCategory
}
