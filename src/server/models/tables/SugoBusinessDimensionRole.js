import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoBusinessDimensionRole = sequelize.define('SugoBusinessDimensionRole',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      business_dimension_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_business_dimension',
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
      tableName: 'sugo_business_dimension_role',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoBusinessDimensionRole.belongsTo(models.SugoBusinessDimension, { foreignKey: 'business_dimension_id' })
        // SugoBusinessDimensionRole.belongsTo(models.SugoRole, { foreignKey: 'role_id' })
      }
    }
  )
  return SugoBusinessDimensionRole
}
