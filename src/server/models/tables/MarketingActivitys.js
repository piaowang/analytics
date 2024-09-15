/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:43:48
 * @description 活动营销中心-活动表
 */
import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketingActivitys',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      group_id: {
        type: dataTypes.STRING(32),
        comment: '分组ID'
      },
      name: {
        type: dataTypes.STRING(50),
        comment: '活动名称'
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '状态：0=关闭;1=开启'
      },
      timer: {
        type: dataTypes.JSONB,
        defaultValue: {
          // date: '',
          // time: ''
        },
        comment: '定时任务策略'
      },
      druid_datasource_id: {
        type: dataTypes.STRING(32),
        comment: '用户群所属项目'
      },
      usergroup_id: {
        type: dataTypes.STRING(32),
        comment: '用户群'
      },
      usergroup_strategy: {
        type: dataTypes.INTEGER,
        comment: '分群更新策略：0=发送时更新人群;1=发送时不更新人群'
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
      send_status: {
        type: dataTypes.INTEGER,
        comment: '发送状态: 0=未发送,1=发送失败,2=发送成功',
        defaultValue: 0
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
      tableName: 'sugo_marketing_activitys',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        model.belongsTo(models.MarketingActivityGroups, {foreignKey: 'group_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return model
}
