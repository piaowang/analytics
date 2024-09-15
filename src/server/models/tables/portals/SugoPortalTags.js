import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoPortalTags = sequelize.define('SugoPortalTags',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      parentId: {
        type: dataTypes.STRING(32),
        comment: '父标签ID',
        references: {
          model: 'sugo_portal_tags',
          key: 'id'
        }
      },
      name: {
        type: dataTypes.STRING(64),
        comment: '标签名称',
        allowNull: false
      },
      
      createdBy: {
        type: dataTypes.STRING(32)
      },
      updatedBy: {
        type: dataTypes.STRING(32)
      },
      companyId: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_portal_tags',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoPortalTags.hasMany(models.SugoPortalTags, {foreignKey: 'parentId'})
        SugoPortalTags.belongsTo(models.SugoPortalTags, {foreignKey: 'parentId'})
        
        SugoPortalTags.hasMany(models.SugoPortalAppTagRelations, {foreignKey: 'tagId', onDelete: 'cascade', hooks: true})
        SugoPortalTags.hasMany(models.SugoPortalTagOrders, {foreignKey: 'tagId', onDelete: 'cascade', hooks: true})
        SugoPortalTags.hasMany(models.SugoPortalTagAppOrders, {foreignKey: 'tagId', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoPortalTags
}
