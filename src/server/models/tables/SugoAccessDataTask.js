/**
 * Created by asd on 17-7-17.
 */

/**
 * 表名  ： sugo_access_data_task
 * 实例名： SugoAccessDataTask
 * @description 数据接入任务记录表
 */

/**
 * @typedef {Object} AccessDataTaskModel
 * @property {String} id
 * @property {String} project_id
 * @property {String} datasource_name
 * @property {Number} status
 * @property {Object} params
 * @property {String} created_at
 * @property {String} updated_at
 */

/**
 * 字段取值
 * @see {ACCESS_DATA_TASK_STATUS} - status
 * @see {ProjectModel}
 */

import { generate } from 'shortid'

export default function (sequelize, dataTypes) {
  return sequelize.define('SugoAccessDataTask', {
    id: {
      type: dataTypes.STRING(32),
      allowNull: false,
      primaryKey: true,
      defaultValue: generate
    },
    project_id: {
      type: dataTypes.STRING(32),
      allowNull: false
    },
    datasource_name: {
      type: dataTypes.STRING(50),
      allowNull: false
    },
    status: {
      type: dataTypes.INTEGER,
      allowNull: false
    },
    params: {
      type: dataTypes.JSONB,
      allowNull: false
    },
    task_id: {
      type: dataTypes.STRING(150)
    }
  }, {
    tableName: 'sugo_access_data_task',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  })
}
