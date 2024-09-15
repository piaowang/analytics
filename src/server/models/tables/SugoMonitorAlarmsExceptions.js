/**
 * 监控告警异常记录
 */
import {generate} from 'shortid'

export default(sequelize, dataTypes) => {

  const SugoMonitorAlarmsExceptions = sequelize.define('SugoMonitorAlarmsExceptions', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    monitor_id: {
      type: dataTypes.STRING(32),
      references: {
        model: 'sugo_monitor_alarms',
        key: 'id'
      }
    },
    monitor_name: {
      type: dataTypes.STRING(32),
      comment: '冗余告警名称'
    },
    trigger_rules: {
      type: dataTypes.STRING(32),
      comment: '触发的规则'
    },
    alarm_level: {
      type: dataTypes.STRING(10),
      comment: '告警等级'
    },
    notify_status: {
      type: dataTypes.JSONB,
      comment: '通知状态',
      defaultValue: []
      /**
       * [{
       *   notify_mode: ''
       *   time: new Date(),
       *   state: false
       * }]
       */
    },
    handle_info: {
      type: dataTypes.JSONB,
      comment: '处理情况',
      defaultValue: {}
      /**
       * {
       *   handleState: 'unhandled' // unhandled, handling, ignored, handled
       *   completeTime: '',
       *   remark: '',
       *   forwardAlarmTypes: [ // 转发的告警方式
       *     {
       *       curTemplate: '', // 通知模版ID（包含接口信息）
       *       receivers: [],     // 接收人ID
       *       receiverDepartment: '', // 如果没有receivers，则转发到此部门
       *       error_template: '',
       *       normal_template: '',
       *     }
       *   ]
       * }
       */
    },
    query_params: {
      type: dataTypes.JSONB,
      comment: '触发告警时的监控条件',
      defaultValue: {}
      /**
       * {
       *  filters: [],
       *  druid_datasource_id: '',
       *  project_name: ''
       * }
       */
    },
    detection_time: {
      type: dataTypes.DATE,
      comment: '异常检测时间'
    },
    alarm_notify_time: {
      type: dataTypes.DATE,
      comment: '告警通知时间'
    },
    check_counter: {
      type: dataTypes.INTEGER,
      defaultValue: 0,
      comment: '异常次数'
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    },
    company_id: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'sugo_monitor_alarms_histories',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      SugoMonitorAlarmsExceptions.belongsTo(models.SugoMonitorAlarms, {foreignKey: 'monitor_id'})
    }
  })
  return SugoMonitorAlarmsExceptions
}
