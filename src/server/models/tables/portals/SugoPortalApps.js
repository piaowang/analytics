import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoPortalApps = sequelize.define('SugoPortalApps',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(64),
        comment: '应用名称',
        allowNull: false
      },
  
      url: {
        type: dataTypes.TEXT,
        comment: '应用链接',
        allowNull: false
      },
  
      description: {
        type: dataTypes.TEXT,
        comment: '应用信息'
      },
  
      openWay: {
        type: dataTypes.STRING(64),
        comment: '打开方式'
      },
  
      img: {
        type: dataTypes.TEXT,
        comment: '缩略图'
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
      tableName: 'sugo_portal_apps',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoPortalApps.hasMany(models.SugoPortalAppTagRelations, {foreignKey: 'appId', onDelete: 'cascade', hooks: true})
        SugoPortalApps.hasMany(models.SugoRoleApp, {foreignKey: 'app_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoPortalApps
}
