/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:43:40
 * @description 智能营销-任务明细表
 */
//!!!!!!!只有掌车逻辑下 字段符合语义 其他逻辑下需要看events.service.js 对应的create bulkCreate方法上的注释
import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketBrainTaskDetails',
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
      member_id: {
        type: dataTypes.STRING(255),
        comment: '会员ID'
      },
      task_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_market_brain_tasks',
          key: 'id'
        },
        comment: '任务ID'
      },
      module_id: {
        type: dataTypes.STRING(32),
        comment: '活动/事件ID'
      },
      execute_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_market_brain_task_executions',
          key: 'id'
        },
        comment: '执行记录ID'
      },
      user_name: {
        type: dataTypes.STRING(50),
        comment: '客户姓名'
      },
      mobile: {
        type: dataTypes.STRING(50),
        comment: '手机号'
      },
      account_manager_name: {
        type: dataTypes.STRING(50),
        comment: '客户经理姓名'
      },
      account_manager_id: {
        type: dataTypes.STRING(50),
        comment: '客户经理id'
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
        comment: '发送渠道：0=短信;1=电话;2=微信;... 由events表的记录来'
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
      msgid: {
        type: dataTypes.STRING(100),
        comment: '企业微信 群发客户联系信息后的一个回调id 用来统计这条消息的发送结果用'
      },
      openid: {
        type: dataTypes.STRING(100),
        comment: '该客户的企业微信open_id 用于统计发送结果时匹配 在生成该记录时(bulkcreate) 就必须有 没有的话走企业微信的后续逻辑全乱'
      },
      who_claim: {
        type: dataTypes.TEXT,
        comment: '认领人的用户id 可能是系统用户 可能是单点登录用户'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_market_brain_task_details',
      timestamps: true,
      underscored: true,
      associate (models) {
        model.belongsTo(models.MarketBrainTasks,  { foreignKey: 'task_id' }),
        model.belongsTo(models.MarketBrainTaskExecutions,  { foreignKey: 'execute_id' })
      }
    }
  )
  return model
}
