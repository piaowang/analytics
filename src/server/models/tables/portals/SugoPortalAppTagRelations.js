import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoPortalAppTagRelations = sequelize.define('SugoPortalAppTagRelations',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      appId: {
        type: dataTypes.STRING(32),
        comment: '应用id',
        references: {
          model: 'sugo_portal_apps',
          key: 'id'
        }
      },
      tagId: {
        type: dataTypes.STRING(32),
        comment: '标签id',
        references: {
          model: 'sugo_portal_tags',
          key: 'id'
        }
      },
      
      createdBy: {
        type: dataTypes.STRING(32)
      },
      updatedBy: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_portal_app_tag_relations',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoPortalAppTagRelations.belongsTo(models.SugoPortalTags, {foreignKey: 'tagId'})
        SugoPortalAppTagRelations.belongsTo(models.SugoPortalApps, {foreignKey: 'appId'})
      }
    }
  )
  return SugoPortalAppTagRelations
}
