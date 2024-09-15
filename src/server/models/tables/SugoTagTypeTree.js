/**
 * 表名  ： sugo_tag_type_tree
 * 实例名： SugoTagTypeTree
 * @description 标签类型分类树表
 */

/**
 * 标签类型分类树表定义
 * @property {String} id
 * @property {String} name - 分类名称
 * @property {String} parent_id 父节点ID
 * @property {String} order 树节点顺序
 * @property {String} datasource_id - 项目关联数据源表(DataSourceModel)的id
 * @property {String} remark - 节点描述
 * @property {String} company_id - 项目所属公司名
 * @property {String} created_at - 创建时间
 * @property {String} updated_at - 更新时间
 * @property {String} created_by - 由谁创建
 * @property {String} updated_by - 更新记录
 */

import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  return sequelize.define('SugoTagTypeTree', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    name: {
      type: dataTypes.STRING(200),
      comment: '分类名称'
    },
    parent_id: {
      type: dataTypes.STRING(32),
      comment: '父节点ID'
    },
    // tree_path: {
    //   type: dataTypes.STRING(1000),
    //   comment: '结构树层级路径例如：0001;0002;0003...'
    // },
    order: {
      type: dataTypes.INTEGER,
      defaultValue: 0,
      comment: '树节点顺序'
    },
    datasource_id: {
      type: dataTypes.STRING(32),
      comment: '数据源ID'
    },
    remark: {
      type: dataTypes.TEXT,
      comment: '节点描述'
    },
    type: {
      type: dataTypes.INTEGER,
      defaultValue: 0
    },
    company_id: {
      type: dataTypes.STRING(32)
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'sugo_tag_type_tree',
    timestamps: true,
    underscored: true
  })
}
