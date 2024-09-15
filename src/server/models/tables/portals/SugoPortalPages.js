import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoPortalPages = sequelize.define('SugoPortalPages',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      portalId: {
        type: dataTypes.STRING(32),
        comment: '门户ID',
        allowNull: false,
        references: {
          model: 'sugo_portals',
          key: 'id'
        }
      },
      type: {
        type: dataTypes.STRING(32),
        comment: '页面类型', // 登录页或首页
        allowNull: false
      },
      templateId: {
        type: dataTypes.STRING(32),
        comment: '模板ID', // 使用的模板ID
        allowNull: false
      },
      backgroundImageId: {
        type: dataTypes.STRING(32),
        comment: '背景图片ID',
        references: {
          model: 'uploaded_files',
          key: 'id'
        }
      },
      params: {
        type: dataTypes.JSON,
        comment: '额外配置',
        defaultValue: {},
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
      tableName: 'sugo_portal_pages',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoPortalPages.belongsTo(models.SugoPortals, {foreignKey: 'portalId'})
        SugoPortalPages.belongsTo(models.UploadedFiles, {foreignKey: 'backgroundImageId'})
      }
    }
  )
  return SugoPortalPages
}
