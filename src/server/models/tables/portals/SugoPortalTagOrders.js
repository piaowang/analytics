import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoPortalTagOrders = sequelize.define('SugoPortalTagOrders',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      tagId: {
        type: dataTypes.STRING(32),
        comment: '标签ID',
        references: {
          model: 'sugo_portal_tags',
          key: 'id'
        }
      },
      affectedUserId: {
        type: dataTypes.STRING(32),
        comment: '受影响的用户ID',
        references: {
          model: 'sugo_user',
          key: 'id'
        }
      },
  
      affectedRoleId: {
        type: dataTypes.STRING(32),
        comment: '受影响的角色ID',
        references: {
          model: 'sugo_role',
          key: 'id'
        }
      },
      
      order: {
        type: dataTypes.JSON,
        comment: '子标签顺序',
        defaultValue: [],
        allowNull: false
      },
  
      createdBy: {
        type: dataTypes.STRING(32)
      },
      updatedBy: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_portal_tag_orders',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoPortalTagOrders.belongsTo(models.SugoPortalTags, {foreignKey: 'tagId'})
        SugoPortalTagOrders.belongsTo(models.SugoUser, {foreignKey: 'affectedUserId'})
        SugoPortalTagOrders.belongsTo(models.SugoRole, {foreignKey: 'affectedRoleId'})
      }
    }
  )
  return SugoPortalTagOrders
}
