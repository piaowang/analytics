/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:43:30
 * @description 自动化营销中心-营销事件表
 */

import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketBrainEvents',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      model_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_market_brain_models',
          key: 'id'
        },
        comment: '模型ID'
      },
      scene_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_market_brain_scenes',
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
      tactics_status: {
        type: dataTypes.INTEGER,
        comment: '状态：0=关闭;1=开启,null 活动没有这个值'
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
      touch_up_way: {
        type: dataTypes.INTEGER,
        comment: '触达方式： 0=自动;1=手动;'
      },
      send_channel: {
        type: dataTypes.INTEGER,
        comment: '发送渠道：0=短信;1=电话;2=微信;... 常数和配置共同决定这些数字对应的是什么'
      },
      guide_content: {
        type: dataTypes.TEXT,
        comment: '活动内容指南 1000字'
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
      project_id: {
        type: dataTypes.STRING(32),
        comment: '效果管理项目ID'
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      jwt_company_id: {
        type: dataTypes.STRING(50),
        comment: '单点登录的用户公司ID'
      },
      jwt_store_id: {
        type: dataTypes.STRING(50),
        comment: '单点登录的用户门店ID'
      },
      jwt_company_name: {
        type: dataTypes.STRING(100),
        comment: '单点登录的用户公司名称'
      },
      jwt_store_name: {
        type: dataTypes.STRING(100),
        comment: '单点登录的用户门店名称'
      },
      belongs: {
        type: dataTypes.INTEGER,
        comment: '状态：0=策略;1=活动'
      },
      params: {
        type: dataTypes.JSON,
        comment: '效果设置项目 tindex所属字段'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_market_brain_events',
      timestamps: true,
      underscored: true,
      associate (models) {
        model.belongsTo(models.MarketBrainModels,  { foreignKey: 'model_id' })
        model.belongsTo(models.MarketBrainScenes,  { foreignKey: 'scene_id' }),
        model.hasMany(models.MarketBrainTasks,  { foreignKey: 'model_id' })
      }
    }
  )
  return model
}
