import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoOverview = sequelize.define('SugoOverview',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      created_by: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_user',
          key: 'id'
        }
      },
      slice_id: {
        type: dataTypes.STRING(32),
        allowNull: true,
        references: {
          model: 'slices',
          key: 'id'
        }
      },
      gallery_id: {
        type: dataTypes.STRING(32),
        allowNull: true,
        references: {
          model: 'sugo_gallery',
          key: 'id'
        }
      },
      company_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'overview',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoOverview.belongsTo(models.SugoUser, { foreignKey: 'created_by', targetKey: 'id' })
        SugoOverview.belongsTo(models.Slices, { foreignKey: 'slice_id' })
        SugoOverview.belongsTo(models.SugoGallery, { foreignKey: 'gallery_id' })
      }
    }
  )
  return SugoOverview
}
