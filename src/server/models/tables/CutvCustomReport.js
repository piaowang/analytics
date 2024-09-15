import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  return sequelize.define('CutvCustomReport', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    datasource_id: {
      type: dataTypes.STRING(255),
      comment: '项目id'
    },
    sdk_type: {
      type: dataTypes.STRING(50),
      comment: 'sdk类型'
    },
    event_name: {
      type: dataTypes.STRING(50),
      comment: '事件名称'
    },
    app_version: {
      type: dataTypes.STRING(50),
      comment: 'app版本'
    },
    device_count: {
      type: dataTypes.INTEGER,
      comment: '设备id统计计数'
    },
    month_active: {
      type: dataTypes.INTEGER,
      comment: '月活跃用户数'
    },
    week_active: {
      type: dataTypes.INTEGER,
      comment: '周活跃用户数'
    },
    device_count_distinct: {
      type: dataTypes.INTEGER,
      comment: '设备id统计去重计数'
    },
    count_date: {
      type: dataTypes.DATE,
      comment: '统计日期'
    }
  },
  {
    tableName: 'cutv_custom_report',
    timestamps: true,
    underscored: true
  })
}
