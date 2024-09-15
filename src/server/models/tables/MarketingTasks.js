/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:43:45
 * @description 智能营销-任务表
 */
import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketingTasks',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      module_id: {
        type: dataTypes.STRING(50),
        comment: '活动/事件名称ID'
      },
      name: {
        type: dataTypes.STRING(50),
        comment: '冗余：活动/事件名称'
      },
      type: {
        type: dataTypes.INTEGER,
        comment: '任务类型：0=自动化营销;1=活动营销'
      },
      predict_total: {
        type: dataTypes.FLOAT,
        comment: '预计发送量:该任务中捞取到的用户数*发送比例。若是实时事件，则该数据不断更新（累加）'
      },
      actual_total: {
        type: dataTypes.FLOAT,
        comment: '实际发送量:在预计发送的用户中，能匹配到手机号或token的量。若是实时事件，则该数据不断更新（累加）'
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '状态：0=准备中;1=运行中;2=执行中;3=已暂停;4=已完成'
      },
      start_time: {
        type: dataTypes.DATE,
        comment: '任务开始时间'
      },
      execute_time: {
        type: dataTypes.DATE,
        comment: '任务执行时间'
      },
      first_execute_time: {
        type: dataTypes.DATE,
        comment: '任务首次执行时间'
      },
      send_type: {
        type: dataTypes.INTEGER,
        comment: '发送类型:0=push; 1=短信'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_marketing_tasks',
      timestamps: true,
      underscored: true
    }
  )
  return model
}
