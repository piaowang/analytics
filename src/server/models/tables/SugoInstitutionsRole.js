import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoInstitutionsRole = sequelize.define('SugoInstitutionsRole',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      institutions_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_institutions',
          key: 'id'
        }
      },
      role_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_role',
          key: 'id'
        }
      }

    },
    {
      tableName: 'sugo_institutions_role',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoInstitutionsRole.belongsTo(models.SugoInstitutions, { foreignKey: 'institutions_id' })
        SugoInstitutionsRole.belongsTo(models.SugoRole, { foreignKey: 'role_id' })
      }
    }
  )
  return SugoInstitutionsRole
}
