import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const dashboards = sequelize.define('Dashboards',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      dashboard_title: {
        type: dataTypes.STRING
      },
      position_json: {
        type: dataTypes.JSONB,
        defaultValue: []
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {
          // 看板中 哪个看板是容器 包含了哪几个单图
          // container: {
          //   [slice.id]: [slice1.id,...]
          // }
          //others TODO
        }
      },
      datasource_id: {
        type: dataTypes.STRING(32)
      },
      description: {
        type: dataTypes.STRING(500)
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      copy_from_project_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'dashboards',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        dashboards.hasMany(models.DashboardSlices, {foreignKey: 'dashboard_id'})
        dashboards.belongsTo(models.SugoDatasources, {foreignKey: 'datasource_id'})
      }
    }
  )
  return dashboards
}
