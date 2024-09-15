import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  let sugoClonePackage = sequelize.define('SugoClonePackage', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(50),
      comment: '克隆包名称'
    },
    desc: {
      type: dataTypes.STRING(300),
      comment: '描述'
    },
    type: {
      type: dataTypes.INTEGER,
      comment: '克隆包类型 1 下载 2 上传'
    },
    task_ids: {
      type: dataTypes.STRING(800),
      comment: '工作流ids'
    },
    project_id: {
      type: dataTypes.STRING(32),
      comment: '所属项目id',
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
    tableName: 'sugo_clone_package',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      sugoClonePackage.belongsTo(models.SugoTaskProject, { foreignKey: 'project_id' })
    }
  })
  return sugoClonePackage
}
