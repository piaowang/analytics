import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const PathAnalysis = sequelize.define('PathAnalysis', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    },
    title: {
      type: dataTypes.STRING(200)
    },
    datasource_id: {
      type: dataTypes.STRING(32),
      references: {
        model: 'sugo_datasources',
        key: 'id'
      }
    },
    params: {
      type: dataTypes.JSONB,
      defaultValue: {}
    },
    company_id: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'path_analysis',
    timestamps: true,
    underscored: true,
    associate (models) {
      PathAnalysis.belongsTo(
        models.SugoDatasources,
        { foreignKey: 'datasource_id' }
      )
    }
  })
  return PathAnalysis
}
