import {generate} from 'shortid'


/**
 * 监控告警表
 */
export default (sequelize, dataTypes) => {
  const SugoMonitorAlarmConditionTemplates = sequelize.define('SugoMonitorAlarmConditionTemplates', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(32),
      comment: '告警条件模版名称'
    },
    project_id: {
      type: dataTypes.STRING(32),
      references: {
        model: 'sugo_projects',
        key: 'id'
      }
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
    tableName: 'sugo_monitor_alarm_condition_templates',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      SugoMonitorAlarmConditionTemplates.belongsTo(models.SugoProjects, { foreignKey: 'project_id' })
    }
  })
  return SugoMonitorAlarmConditionTemplates
}
