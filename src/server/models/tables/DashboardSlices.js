import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const dashboardSlices = sequelize.define('DashboardSlices',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      dashboard_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'dashboards',
          key: 'id'
        }
      },
      slice_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'slices',
          key: 'id'
        }
      },
      copy_from_project_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'dashboard_slices',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        dashboardSlices.belongsTo(models.Dashboards)
        dashboardSlices.belongsTo(models.Slices)
      }
    }
  )
  return dashboardSlices
}
