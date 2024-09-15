import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoPortals = sequelize.define('SugoPortals',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(64),
        comment: '门户名称',
        allowNull: false
      },
      basePath: {
        field: 'base_path',
        type: dataTypes.STRING,
        comment: '门户路径',
        allowNull: false
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '门户状态，1=开, 0=关',
        defaultValue: 1,
        allowNull: false
      },
      tags: {
        type: dataTypes.JSONB,
        comment: '分组标签',
        defaultValue: [],
        allowNull: false
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
      },
      companyId: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_portals',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoPortals.hasMany(models.SugoPortalPages, {foreignKey: 'portal_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoPortals
}
