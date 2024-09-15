/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:43:30
 * @description 自动化营销中心-营销事件表
 */

import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketingEvents',
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
      scene_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_marketing_scenes',
          key: 'id'
        },
        comment: '场景ID'
      },
      name: {
        type: dataTypes.STRING(50),
        comment: '名称'
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '状态：0=关闭;1=开启'
      },
      timer_type: {
        type: dataTypes.INTEGER,
        comment: '营销时机:0=定时发送;1=实时发送'
      },
      timer: {
        type: dataTypes.JSONB,
        defaultValue: {},
        comment: '定时时间值'
      },
      usergroup_id: {
        type: dataTypes.STRING(32),
        comment: '用户群'
      },
      send_channel: {
        type: dataTypes.INTEGER,
        comment: '发送渠道：0=push;1=短信;...'
      },
      copywriting: {
        type: dataTypes.JSONB,
        defaultValue: {
          // title,
          // conent,
          // url,
        },
        comment: '文案内容'
      },
      send_ratio: {
        type: dataTypes.FLOAT,
        comment: '发送比例：0~1;'
      },
      project_id: {
        type: dataTypes.STRING(32),
        comment: '效果管理项目ID'
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
      tableName: 'sugo_marketing_events',
      timestamps: true,
      underscored: true,
      associate (models) {
        model.hasMany(models.MarketBrainTasks,  { foreignKey: 'module_id' }),
        model.belongsTo(models.MarketingModels,  { foreignKey: 'model_id' })
        model.belongsTo(models.MarketingScenes,  { foreignKey: 'scene_id' })
      }
    }
  )
  return model
}
