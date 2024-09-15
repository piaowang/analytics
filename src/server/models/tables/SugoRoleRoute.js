import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoRoleRoute = sequelize.define('SugoRoleRoute',
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
      route_id: {
        type: dataTypes.STRING(200)
      }
    },
    {
      tableName: 'sugo_role_route',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoRoleRoute.belongsTo(models.SugoRole, {foreignKey: 'role_id'})
      }
    }
  )
  return SugoRoleRoute
}
