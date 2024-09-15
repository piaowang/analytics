import {generate} from 'shortid'

/**
 * 监控告警表
 */
export default (sequelize, dataTypes) => {
  const SugoMonitorAlarms = sequelize.define('SugoMonitorAlarms', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(32),
      comment: '告警名称'
    },
    project_id: {
      type: dataTypes.STRING(32),
      references: {
        model: 'sugo_projects',
        key: 'id'
      }
    },
    project_name: {
      type: dataTypes.STRING(255),
      comment: '冗余项目名称'
    },
    time_rules: {
      type: dataTypes.JSONB,
      comment: '设定告警目标-检测频率-时间',
      defaultValue: {}
      /**
       * {
       *  time: 5,        // 时间频率
       *  unit: "minutes" // 时间单位
       * }
       */
    },
    metric_rules: {
      type: dataTypes.JSONB,
      comment: '设定告警目标-检查指标-规则',
      defaultValue: {}
      /**
       * {
       *  metric: '',     // 指标ID
       *  rules: [{
       *    operator: '',  // 操作符: greaterThan、lessThan、between、exclude
       *    threshold: 0,   // 阀值
       *    thresholdEnd: 1, // 阀值（end)
       *    level: ''       // 等级: info, warning, fatal
       *  }]
       * }
       */
    },
    query_params: {
      type: dataTypes.JSONB,
      comment: '设定监控条件',
      defaultValue: {}
      /**
       * {
       *  filters: [],
       *  druid_datasource_id: '',
       *  project_name: ''
       * }
       */
    },
    alarm_recovery: {
      type: dataTypes.BOOLEAN,
      comment: '恢复正常通知',
      defaultValue: false
    },
    alarm_types: {
      type: dataTypes.JSONB,
      comment: '告警方式：短信、邮件、自定义接口',
      defaultValue: []
      /**
       [
         {
            curInterface: '', // 告警接口ID
            receivers: []     // 接收人ID
          }
        ]
        */
    },
    alarm_rule: {
      type: dataTypes.STRING(32),
      comment: '告警规则: fibonacci, everyTime, sameError'
    },
    status: {
      type: dataTypes.INTEGER,
      comment: '告警状态: 1=监控中；0=已暂停',
      defaultValue: 1
    },
    prev_monitor_time: {
      type: dataTypes.DATE,
      comment: '上次检测时间'
    },
    prev_monitor_result: {
      type: dataTypes.INTEGER,
      comment: '上次检测结果: 1=正常；0=异常'
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
    tableName: 'sugo_monitor_alarms',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      SugoMonitorAlarms.belongsTo(models.SugoProjects, { foreignKey: 'project_id' })
      SugoMonitorAlarms.hasMany(models.SugoMonitorAlarmsExceptions, {foreignKey: 'monitor_id', onDelete: 'cascade', hooks: true})
    }
  })
  return SugoMonitorAlarms
}
