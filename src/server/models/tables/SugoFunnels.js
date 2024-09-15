import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const sugoFunnels = sequelize.define('SugoFunnels',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      funnel_name: {
        type: dataTypes.STRING(255)
      },
      druid_datasource_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_datasources',
          key: 'id'
        }
      },
      datasource_name: {
        type: dataTypes.STRING(50)
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {}
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      description: {
        type: dataTypes.STRING(500)
      },
      company_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_funnels',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        sugoFunnels.belongsTo(models.SugoDatasources, {foreignKey: 'druid_datasource_id'})
      }
    }
  )
  return sugoFunnels
}
