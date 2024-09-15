/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:43:40
 * @description 智能营销-任务明细表
 */
import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketingTaskDetails',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      distinct_id: {
        type: dataTypes.STRING(255),
        comment: '用户ID'
      },
      task_id: {
        type: dataTypes.STRING(32),
        comment: '任务ID'
      },
      module_id: {
        type: dataTypes.STRING(32),
        comment: '活动/事件ID'
      },
      execute_id: {
        type: dataTypes.STRING(32),
        comment: '执行记录ID'
      },
      group_type: {
        type: dataTypes.INTEGER,
        comment: '用户分组:0=发送组,1=对比组'
      },
      mobile: {
        type: dataTypes.STRING(50),
        comment: '手机号'
      },
      token: {
        type: dataTypes.STRING(50),
        comment: 'Token'
      },
      title: {
        type: dataTypes.STRING(50),
        comment: '标题'
      },
      content: {
        type: dataTypes.TEXT,
        comment: '文案内容'
      },
      page_code: {
        type: dataTypes.TEXT,
        comment: '落地页编码/URL'
      },
      send_state: {
        type: dataTypes.INTEGER,
        comment: '是否已发送：0=未发送；1=已发送'
      },
      send_result: {
        type: dataTypes.INTEGER,
        comment: '是否发送成功:0=失败；1=成功'
      },
      send_type: {
        type: dataTypes.INTEGER,
        comment: '发送渠道:0=短信;1=电话;2=微信'
      },
      send_time: {
        type: dataTypes.DATE,
        comment: '发送时间'
      },
      open_state: {
        type: dataTypes.INTEGER,
        comment: '是否打开：0=未打开; 1=已打开'
      },
      open_time: {
        type: dataTypes.DATE,
        comment: '打开时间'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_marketing_task_details',
      timestamps: true,
      underscored: true
    }
  )
  return model
}
