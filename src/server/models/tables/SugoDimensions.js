
/**
 * @typedef {object} DimensionModel
 * @property {string} id
 * @property {string} parentId
 * @property {string} name
 * @property {string} title
 * @property {number} type
 * @property {Array<string>} user_ids
 * @property {Array<string>} role_ids
 * @property {string} company_id
 * @property {Array<string>} tags
 * @property {object} params
 * @property {boolean} is_druid_dimension
 * @property {string} datasource_type
 * @property {string} updated_by
 * @property {string} created_by
 * @property {string} updated_at
 * @property {string} created_at
 */

import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoDimensions = sequelize.define('SugoDimensions',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      parentId: {
        type: dataTypes.STRING(32),
        comment: '数据源表id',
        references: {
          model: 'sugo_datasources',
          key: 'id'
        }
      },
      name: {
        type: dataTypes.STRING(255),
        validate: {
          is: /^[_A-Za-z][\w]{1,49}$/i // 可用字母、数字、下划线，但必须以字母或下划线开头，长度为2至50位
        }
      },
      title: {
        type: dataTypes.STRING(255)
      },
      tag_desc: {
        type: dataTypes.STRING(500),
        comment: 'uindex维度的标签业务规则描述'
      },
      type: {
        type: dataTypes.INTEGER,
        comment: '0=Long,1=Float,2=String,3=DateString;4=Date;5=Integer;6=TEXT;7=DOUBLE;8=BIGDECIMAL'
      },
      datasource_type: {
        type: dataTypes.STRING(100),
        defaultValue: 'default',
        comment: '数据源类型默认为`default`, 标签体系管理为`tag`，通用的为`default_tag`'
      },
      user_ids: {
        type: dataTypes.JSONB,
        defaultValue: []
      },
      role_ids: {
        type: dataTypes.JSONB,
        defaultValue: []
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      tags: {
        type: dataTypes.JSONB,
        defaultValue: []
      },
      tags_layer: {
        type: dataTypes.JSONB,
        defaultValue: []
      },
      params: {
        type: dataTypes.JSONB,
        defaultValue: {}
      },
      is_druid_dimension: {
        type: dataTypes.BOOLEAN,
        defaultValue: false
      },
      tag_extra: {
        type: dataTypes.JSONB,
        /**
         * tag_extra => keys: {
          * // tag_desc: 定义口径
          * data_from: 数据来源
          * cleaning_rule: 清洗规则
          * life_cycle: 生命周期
          * is_base_prop: 用户基础属性
          * is_base_tag: 用户基础标签
         * }
         */
        defaultValue: {},
        comment: '标签维度扩展字段'
      }
    },
    {
      tableName: 'sugo_dimensions',
      timestamps: true,
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      associate: function (models) {
        SugoDimensions.belongsTo(models.SugoDatasources, {foreignKey: 'parentId', targetKey: 'id'})
      }
    }
  )
  return SugoDimensions
}
