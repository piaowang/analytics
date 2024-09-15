/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:43:42
 * @description 智能营销-事件任务执行记录表
 */
import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketingTaskExecutions',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      task_id: {
        type: dataTypes.STRING(50),
        comment: '任务ID'
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
      execute_time: {
        type: dataTypes.DATE,
        comment: '任务执行时间'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_marketing_task_executions',
      timestamps: true,
      underscored: true
    }
  )
  return model
}
