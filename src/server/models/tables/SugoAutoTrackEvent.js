
/**
 * @typedef {Object} AutoTrackEvent 全埋点事件圈选表
 * @property {String} id
 * @property {String} appid - DataAnalysis 表id
 * @property {String} page - 事件所属页面
 * @property {String} event_path - 元素path
 * @property {String} similar_path - 同类元素path
 * @property {String} event_type - 事件类型
 * @property {String} event_name - 事件名称
 * @property {String} event_path_type - 事件类型
 * @property {String} event_id - 事件id
 * @property {String} screenshot_id - 图片ID
 * @property {String} sugo_autotrack_path // 全埋点元素路径
 * @property {String} sugo_autotrack_position // 全埋点元素位置
 * @property {String} sugo_autotrack_content // 全埋点文本信息
 * @property {String} sugo_autotrack_page_path // 全埋点页面路径
 * @property {String} event_memo // 描述
 */


import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const AutoTrackEvent = sequelize.define('AutoTrackEvent', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    appid: {
      type: dataTypes.STRING(32)
    },
    page: {
      type: dataTypes.STRING(255)
    },
    event_path: {
      type: dataTypes.TEXT
    },
    event_type: {
      type: dataTypes.STRING(30)
    },
    event_name: {
      type: dataTypes.STRING(50)
    },
    sugo_autotrack_path: {
      type: dataTypes.STRING(500)
    },
    sugo_autotrack_position: {
      type: dataTypes.STRING(50)
    },
    sugo_autotrack_content: {
      type: dataTypes.STRING(255)
    },
    sugo_autotrack_page_path: {
      type: dataTypes.STRING(255)
    },
    event_path_type: {
      type: dataTypes.STRING(20)
    },
    event_id: {
      type: dataTypes.STRING(36)
    },
    screenshot_id: {
      type: dataTypes.STRING(50)
    },
    event_memo: {
      type: dataTypes.STRING(1000)
    },
    created_by: {
      type: dataTypes.STRING(36)
    },
    updated_by: {
      type: dataTypes.STRING(36)
    },
    app_version: {
      type: dataTypes.STRING(36)
    }
  }, {
    tableName: 'sugo_auto_track_event',
    timestamps: true,
    underscored: true,
    createdAt: 'created_on',
    updatedAt: 'updated_on'
  })
  return AutoTrackEvent
}
