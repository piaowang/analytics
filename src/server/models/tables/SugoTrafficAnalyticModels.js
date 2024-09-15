import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoTrafficAnalyticModels = sequelize.define('SugoTrafficAnalyticModels',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(255)
      },
      druid_datasource_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_datasources',
          key: 'id'
        }
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {
          /*        metrics: [],
          filterCols: []
          metricalField: [] */
        }
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      company_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_traffic_analytic_models',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoTrafficAnalyticModels.belongsTo(models.SugoDatasources, {foreignKey: 'druid_datasource_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoTrafficAnalyticModels
}
