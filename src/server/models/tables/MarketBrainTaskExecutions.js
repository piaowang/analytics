import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketBrainTaskExecutions',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(50),
        comment: '生成记录时 活动的名称 非冗余 必要'
      },
      task_id: {
        type: dataTypes.STRING(50),
        references: {
          model: 'sugo_market_brain_tasks',
          key: 'id'
        },
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
      touch_up_way: {
        type: dataTypes.INTEGER,
        comment: '触达方式： 0=自动;1=手动;'
      },
      send_channel: {
        type: dataTypes.INTEGER,
        comment: '发送渠道：0=短信;1=电话;2=微信;...'
      },
      usergroup_id: {
        type: dataTypes.STRING(32),
        comment: '用户群 非冗余 表示生成本次执行记录时 是哪个用户群'
      },
      jwt_company_id: {
        type: dataTypes.STRING(50),
        comment: '执行时 单点登录的用户公司ID'
      },
      jwt_store_id: {
        type: dataTypes.STRING(50),
        comment: '执行时 单点登录的用户门店ID'
      },
      jwt_company_name: {
        type: dataTypes.STRING(100),
        comment: '执行时 单点登录的用户公司名称'
      },
      jwt_store_name: {
        type: dataTypes.STRING(100),
        comment: '执行时 单点登录的用户门店名称'
      },
      scene_model_name: {
        type: dataTypes.STRING(100),
        comment: '执行时 场景-模型名称'
      },
      usergroup_title: {
        type: dataTypes.STRING(100),
        comment: '执行时 用户群名称'
      },
      usergroup_comment: {
        type: dataTypes.STRING(100),
        comment: '执行时 用户群备注'
      },
      who_claim: {
        type: dataTypes.TEXT,
        comment: '认领人的用户id 可能是系统用户 可能是单点登录用户'
      },
      content: {
        type: dataTypes.TEXT,
        comment: '文案内容'
      },
      guide_content: {
        type: dataTypes.TEXT,
        comment: '活动指南'
      },
      url: {
        type: dataTypes.TEXT,
        comment: '活动链接'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_market_brain_task_executions',
      timestamps: true,
      underscored: true,
      associate (models) {
        model.belongsTo(models.MarketBrainTasks,  { foreignKey: 'task_id' }),
        model.hasMany(models.MarketBrainTaskDetails,  { foreignKey: 'execute_id' })
      }
    }
  )
  return model
}
