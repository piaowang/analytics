import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoRoleSlice = sequelize.define('SugoRoleSlice',
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
      slice_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'slices',
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
      tableName: 'sugo_role_slice',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoRoleSlice.belongsTo(models.SugoRole, {foreignKey: 'role_id'})
        SugoRoleSlice.belongsTo(models.Slices, {foreignKey: 'slice_id'})
      }
    }
  )
  return SugoRoleSlice
}
