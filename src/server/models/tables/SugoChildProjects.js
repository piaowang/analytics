/**
 * 表名  ： sugo_child_projects
 * 实例名： SugoChildProjects
 * @description 项目表定义与说明
 */

/**
 * ChildProject表定义
 * @property {String} id
 * @property {String} name - 项目名称，同一公司下的项目名称唯一
 * @property {String} project_id - 父项目 id
 * @property {Number} status - 项目显示状态，用于业务判断，只能取ProjectStatus中定义的值
 * @property {Array<String>} role_ids 授权用户组ID
 * @property {JSONB} extra_params - 扩展属性
 * @property {String} created_at - 创建时间
 * @property {String} updated_at - 更新时间
 * @property {String} created_by - 由谁创建
 * @property {String} updated_by - 更新记录
 */


import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  return sequelize.define('SugoChildProjects', {
    id: {
      type: dataTypes.STRING(32),
      allowNull: false,
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(32),
      allowNull: true
    },
    project_id: {
      type: dataTypes.STRING(32),
      allowNull: true
    },
    status: {
      type: dataTypes.INTEGER,
      allowNull: true
    },
    role_ids: {
      type: dataTypes.JSONB,
      defaultValue: []
    },
    params: {
      type: dataTypes.JSONB,
      defaultValue: {}
    },
    created_by: {
      type: dataTypes.STRING,
      allowNull: true
    },
    updated_by: {
      type: dataTypes.STRING,
      allowNull: true
    }
  }, {
    tableName: 'sugo_child_projects',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    associate: function (models) {
      models.SugoChildProjects.belongsTo(models.SugoProjects, {foreignKey: 'project_id', onDelete: 'cascade', hooks: true})
      models.SugoChildProjects.hasMany(models.Slices, {foreignKey: 'child_project_id', onDelete: 'cascade', hooks: true})
    }
  })
}
