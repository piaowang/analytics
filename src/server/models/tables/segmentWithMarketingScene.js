import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('SegmentWIthMarketingScene',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      scene_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_marketing_scenes',
          key: 'id'
        },
        comment: '模型ID'
      },
      segment_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'segment',
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
      tableName: 'sugo_segment_marketingscene',
      timestamps: true,
      underscored: true,
      associate (models) {
        model.belongsTo(models.Segment,  { foreignKey: 'segment_id' })
        model.belongsTo(models.MarketingScenes,  { foreignKey: 'scene_id' })
      }
    }
  )
  return model
}
