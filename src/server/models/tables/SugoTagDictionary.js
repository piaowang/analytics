/**
 * （Uindex）用户画像字典表
 * @typedef {object} SugoTagDictionary
 * @property {string} id
 * @property {string} name
 * @property {string} title
 * @property {number} sub_type
 * @property {string} tag_value
 * @property {string} tag_datasource_name
 * @property {string} project_id
 * @property {string} company_id
 * @property {date} recent_run_at
 * @property {string} updated_by
 * @property {string} created_by
 * @property {string} updated_at
 * @property {string} created_at
 */

import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  return sequelize.define(
    'SugoTagDictionary',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(255),
        validate: {
          is: /^[_A-Za-z][\w]{1,49}$/i // 可用字母、数字、下划线，但必须以字母或下划线开头，长度为2至50位
        }
      },
      title: {
        type: dataTypes.STRING(255),
        comment: '别名'
      },
      sub_type: {
        type: dataTypes.INTEGER,
        comment: '子标签类型：1=数值；2=字符'
      },
      tag_value: {
        type: dataTypes.STRING(1000),
        comment: '标签取值'
      },
      tag_datasource_name: {
        type: dataTypes.STRING(50),
        comment: '标签数据源表名'
      },
      project_id: {
        type: dataTypes.STRING(50),
        comment: '项目id'
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      recent_updated_at: {
        type: dataTypes.DATE,
        comment: '最近更新时间'
      },
      tag_order: {
        type: dataTypes.INTEGER,
        comment: '排序'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_tag_dictionary',
      freezeTableName: true,
      underscored: true,
      timestamps: true
    }
  )
}
