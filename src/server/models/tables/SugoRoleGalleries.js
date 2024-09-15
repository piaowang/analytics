import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoRoleGalleries = sequelize.define('SugoRoleGalleries',
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
      gallery_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_gallery',
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
      tableName: 'sugo_role_galleries',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoRoleGalleries.belongsTo(models.SugoRole, { foreignKey: 'role_id' })
        SugoRoleGalleries.belongsTo(models.SugoGallery, { foreignKey: 'gallery_id' })
      }
    }
  )
  return SugoRoleGalleries
}
