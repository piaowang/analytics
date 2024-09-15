import { generate } from 'shortid'

/**
 * 告警通知模版表
 */
export default (sequelize, dataTypes) => {
  return sequelize.define('SugoAlarmNotifyTemplates', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(50),
      comment: '告警通知模版名称'
    },
    interface_id: {
      type: dataTypes.STRING(32),
      comment: '关联的接口ID'
      // 由于有内置的接口（邮件、短信、微信），所以无法建立约束：不存在 ID sugo_sms_alarm, sugo_email_alarm, sugo_wechat_alarm
      /*      references: {
              model: 'sugo_alarm_interfaces',
              key: 'id'
            }*/
    },
    error_template: {
      type: dataTypes.TEXT,
      comment: '发生异常时的告警通知模版'
    },
    normal_template: {
      type: dataTypes.TEXT,
      comment: '恢复正常时的告警通知模版'
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
    tableName: 'sugo_alarm_notify_templates', // southern_alarm_notify_templates
    timestamps: true,
    underscored: true
  })
}
