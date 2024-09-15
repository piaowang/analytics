import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('LifeCycleMarketingModel',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      model_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_marketing_models',
          key: 'id'
        },
        comment: '模型ID'
      },
      life_cycle_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_life_cycles',
          key: 'id'
        },
        comment: '模型ID'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_lifecycle_marketingmodel',
      timestamps: true,
      underscored: true,
      associate (models) {
        model.belongsTo(models.MarketingModels,  { foreignKey: 'model_id' })
        model.belongsTo(models.LifeCycles,  { foreignKey: 'life_cycle_id' })
      }
    }
  )
  return model
}
