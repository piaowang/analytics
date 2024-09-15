import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoRoleDashboard = sequelize.define('SugoRoleDashboard',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      role_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_role',
          key: 'id'
        }
      },
      dashboard_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'dashboards',
          key: 'id'
        }
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      meta: {
        type: dataTypes.JSON,
        comment: '其他信息，可能包括更具体的权限'
      }
    },
    {
      tableName: 'sugo_role_dashboard',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoRoleDashboard.belongsTo(models.SugoRole, {foreignKey: 'role_id'})
        SugoRoleDashboard.belongsTo(models.Dashboards, {foreignKey: 'dashboard_id'})
      }
    }
  )
  return SugoRoleDashboard
}
