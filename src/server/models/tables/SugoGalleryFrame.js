import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoGalleryFrame = sequelize.define('SugoGalleryFrame',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      parent_id: {
        type: dataTypes.STRING(32),
        allowNull: false
      },
      name: {
        type: dataTypes.STRING(32),
        allowNull: false
      },
      slice_ids: {
        type: dataTypes.JSONB,
        defaultValue: []
      },
      created_by: {
        type: dataTypes.STRING(32),
        allowNull: false
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_gallery_frame',
      freezeTableName: true,
      timestamps: true,
      underscored: true,
      associate: (models) => {
        SugoGalleryFrame.belongsTo(models.SugoGallery, { foreignKey: 'parent_id', targetKey: 'id' })
      }
    }
  )
  return SugoGalleryFrame
}
