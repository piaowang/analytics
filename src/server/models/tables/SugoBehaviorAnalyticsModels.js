import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoBehaviorAnalyticModels = sequelize.define('SugoBehaviorAnalyticModels',
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
          // filterCols: ['area', 'device', 'system', 'browser', 'network', 'operator'],
          // metricalField: '',
          // filterDict: {},
          // timeFilter: {
          //   dateType: '-1 day',
          //   dateRange: []
          // },
          // eventName: '点击',
          // chartBoxSetting: {
          //   timeFilter: {
          //     dateType: ['-1 days startOf day', 'startOf day -1 ms'],
          //     dateRange: []
          //   },
          //   granularity: 'PT1H',
          //   selectMetric: ''
          // }
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
      tableName: 'sugo_behavior_analytic_models',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoBehaviorAnalyticModels.belongsTo(models.SugoDatasources, {foreignKey: 'druid_datasource_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoBehaviorAnalyticModels
}
