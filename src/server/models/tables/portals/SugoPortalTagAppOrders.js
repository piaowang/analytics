import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoPortalTagAppOrders = sequelize.define('SugoPortalTagAppOrders',
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
  
      appIdOrder: {
        type: dataTypes.JSON,
        comment: '应用id顺序',
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
      tableName: 'sugo_portal_tag_app_orders',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoPortalTagAppOrders.belongsTo(models.SugoPortalTags, {foreignKey: 'tagId'})
        SugoPortalTagAppOrders.belongsTo(models.SugoUser, {foreignKey: 'affectedUserId'})
        SugoPortalTagAppOrders.belongsTo(models.SugoRole, {foreignKey: 'affectedRoleId'})
      }
    }
  )
  return SugoPortalTagAppOrders
}
