/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:43:37
 * @description 自动化营销中心-营销场景表
 */
import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketingScenes',
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
      name: {
        type: dataTypes.STRING(50),
        comment: '名称'
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '状态：0=停用;1=启用'
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
      tableName: 'sugo_marketing_scenes',
      timestamps: true,
      underscored: true,
      associate (models) {
        model.belongsTo(models.MarketingModels,  { foreignKey: 'model_id' })
        model.hasMany(models.MarketingEvents,  { foreignKey: 'scene_id' })
        model.hasMany(models.SegmentWIthMarketingScene,  { foreignKey: 'scene_id' })
      }
    }
  )
  return model
}
