/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:36:24
 * @desc 自动化营销中心-营销模型表
 */

import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketingModels',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(50),
        comment: '名称'
      },
      remark: {
        type: dataTypes.TEXT,
        comment: '说明'
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_marketing_models',
      timestamps: true,
      underscored: true,
      associate (models) {
        model.hasMany(models.MarketingScenes,  { foreignKey: 'model_id' })
        model.hasMany(models.MarketingEvents,  { foreignKey: 'model_id' })
        model.hasMany(models.LifeCycleMarketingModel,  { foreignKey: 'model_id' })
      }
    }
  )
  return model
}
