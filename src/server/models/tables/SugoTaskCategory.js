import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  let sugoTaskCategory = sequelize.define(
    'SugoTaskCategory',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      title: {
        type: dataTypes.STRING(50),
        comment: '工作流分类'
      },
      parent_id: {
        type: dataTypes.STRING(32),
        comment: '分类可嵌套-父级分类id'
      },
      order: {
        type: dataTypes.STRING(500),
        comment: ''
      },
      sort: {
        type: dataTypes.STRING(32),
        comment: ''
      },
      category_project_id: {
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
      },
      type: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_task_category',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        sugoTaskCategory.belongsTo(models.SugoTaskProject, { foreignKey: 'category_project_id' })
      }
    }
  )
  return sugoTaskCategory
}
