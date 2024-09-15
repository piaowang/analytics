
import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoRoleApp = sequelize.define('SugoRoleApp',
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
      app_id: {
        type: dataTypes.STRING(200),
        references: {
          model: 'sugo_portal_apps',
          key: 'id'
        }
      }
    },
    {
      tableName: 'sugo_role_app',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoRoleApp.belongsTo(models.SugoRole, {foreignKey: 'role_id'})
        SugoRoleApp.belongsTo(models.SugoPortalApps, {foreignKey: 'app_id'})
      }
    }
  )
  return SugoRoleApp
}
