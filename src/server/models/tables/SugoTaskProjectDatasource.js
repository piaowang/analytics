import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  let sugoTaskProjectDatasource = sequelize.define('SugoTaskProjectDatasource', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    db_id: {
      type: dataTypes.STRING(50),
      comment: '数据源id'
    },
    task_project_id: {
      type: dataTypes.STRING(32),
      comment: '所属项目',
      references: {
        model: 'sugo_task_project',
        key: 'id'
      }
    },
    is_private: {
      type: dataTypes.BOOLEAN,
      comment: '是否是私有数据源'
    },
    is_use: {
      type: dataTypes.BOOLEAN,
      comment: '授权后是否使用'
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
    tableName: 'sugo_task_project_datasource',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      sugoTaskProjectDatasource.belongsTo(models.SugoTaskProject, { foreignKey: 'task_project_id' })
    }
  })
  return sugoTaskProjectDatasource
}
