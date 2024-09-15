/**
 * 
 * 该表用于记录andorid以及ios的h5页面的埋点信息
 * 事件表
 */
/**
 * 表名  ： sugo_track_event_mobile_h5
 * 实例名： SugoTrackEventMobileH5
 */


/**
 * @typedef {Object} SugoTrackEventMobileH5Model
  * @property {String} id
 * @property {String} appid - DataAnalysis 表id
 * @property {String} page - 事件所属页面
 * @property {String} event_id - 事件id
 * @property {String} event_path - 元素path
 * @property {String} similar_path - 同类元素path
 * @property {String} event_type - 事件类型
 * @property {String} event_name - 事件名称
 * @property {String} code - 注入代码
 * @property {Boolean} advance - 是否开启高级功能
 * @property {Boolean} similar - 是否是同类元素
 * @property {Boolean} is_global - 是否是全局事件
 * @property {Object} binds - 关联元素
 * @property {Boolean} cross_page
 * @property {String} screenshot_id - 图片ID
 * @property {String} project_id - 项目ID
 */


/**
 * 关联及引用定义
 * event_bindings_version 功能见 AppVersionModel 中的描述
 * @see {AppVersionModel}
 * @see {DataAnalysis}
 * @see {TrackEventDraftModel}
 */

import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const TrackEventMobileH5 = sequelize.define('TrackEventMobileH5', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    appid: {
      type: dataTypes.STRING(32),
      references: {
        model: 'sugo_data_analysis',
        key: 'id'
      }
    },
    page: {
      type: dataTypes.STRING(255)
    },
    event_path: {
      type: dataTypes.TEXT
    },
    similar_path: {
      type: dataTypes.TEXT
    },
    event_id: {
      type: dataTypes.STRING(36)
    },
    event_type: {
      type: dataTypes.STRING(30)
    },
    event_name: {
      type: dataTypes.STRING(255)
    },
    code: {
      type: dataTypes.TEXT
    },
    advance: {
      type: dataTypes.BOOLEAN
    },
    similar: {
      type: dataTypes.BOOLEAN
    },
    is_global: {
      type: dataTypes.STRING(3)
    },
    binds: {
      type: dataTypes.JSONB
    },
    cross_page: {
      type: dataTypes.BOOLEAN
    },
    screenshot_id: {
      type: dataTypes.STRING(50)
    },
    project_id: {
      type: dataTypes.STRING(50)
    }
  }, {
    tableName: 'sugo_track_event_mobile_h5',
    timestamps: true,
    underscored: true,
    createdAt: 'created_on',
    updatedAt: 'changed_on'
  })
  return TrackEventMobileH5
}
