import { generate } from 'shortid'

//目前这张表的功能完全可以由events代替 整张表冗余
export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketBrainTasks',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      module_id: {
        type: dataTypes.STRING(50),
        references: {
          model: 'sugo_market_brain_events',
          key: 'id'
        },
        comment: '活动/事件名称ID'
      },
      name: {
        type: dataTypes.STRING(50),
        comment: '冗余：活动/事件名称'
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
        comment: '发送渠道：0=自动;1=手动 由events表的send_channel来'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_market_brain_tasks',
      timestamps: true,
      underscored: true,
      associate (models) {
        model.hasMany(models.MarketBrainTaskExecutions,  { foreignKey: 'task_id' }),
        model.hasMany(models.MarketBrainTaskDetails,  { foreignKey: 'task_id' }),
        model.belongsTo(models.MarketBrainEvents,  { foreignKey: 'module_id' })
      }
    }
  )
  return model
}
