import {generate} from 'shortid'

/**
 * 告警接口表（暂时是监控告警在使用）
 */
export default (sequelize, dataTypes) => {
  return sequelize.define('SugoAlarmInterfaces', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(50)
    },
    url: {
      type: dataTypes.STRING(255)
    },
    type: {
      type: dataTypes.INTEGER,
      comment: '接口类型：0=邮件;1=短信;2=微信'
    },
    method: {
      type: dataTypes.STRING(32)
    },
    content_type: {
      type: dataTypes.STRING(32)
    },
    error_template: {
      type: dataTypes.TEXT
    },
    normal_template: {
      type: dataTypes.TEXT
    },
    params: {
      type: dataTypes.JSONB,
      defaultValue: []
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
    tableName: 'sugo_alarm_interfaces',
    timestamps: true,
    underscored: true
  })
}
