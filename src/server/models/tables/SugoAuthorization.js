import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoAuthorization = sequelize.define('SugoAuthorization',
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
      status: {
        type: dataTypes.INTEGER
      },
      model_id: {
        type: dataTypes.STRING(32)
      },
      model_type: {
        type: dataTypes.STRING(32)
      },
      type: {
        type: dataTypes.INTEGER
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      meta: {
        type: dataTypes.JSON,
        comment: '其他信息，可能包括更具体的权限'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_authorization',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoAuthorization.belongsTo(models.SugoRole, { foreignKey: 'role_id' })
      }
    }
  )
  return SugoAuthorization
}
