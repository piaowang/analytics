import {generate} from 'shortid'

/**
 * 标签计算管理表
 * @typedef {object} SugoTagDictionary
 * @property {string} id
 * @property {string} title
 * @property {string} hql
 * @property {Array<string>} tags
 * @property {Object} rules
 * @property {number} weight
 * @property {string} project_id
 * @property {number} status
 * @property {date} recent_run_at
 * @property {date} updated_by
 * @property {string} created_by
 * @property {date} updated_at
 * @property {string} created_at
 */
export default (sequelize, dataTypes) => {
  return sequelize.define('SugoTagHql', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    title: {
      type: dataTypes.STRING(50),
      allowNull: false,
      comment: '标题'
    },
    hql: {
      type: dataTypes.TEXT,
      allowNull: false,
      comment: 'HQL语句'
    },
    tags: {
      type: dataTypes.JSONB,
      defaultValue: [],
      comment: '关联标签'
    },
    rules: {
      type: dataTypes.JSONB,
      /**
       * {"period": "hour", "unitType": "0", "cronExpression": "0 * * * *"}
       */
      defaultValue: {},
      comment: '定时调度（执行）频率'
    },
    weight: {
      type: dataTypes.INTEGER,
      defaultValue: 0,
      comment: '标签权重0=普通；1=中等；2=优先'
    },
    project_id: {
      type: dataTypes.STRING(32),
      allowNull: false,
      comment: '项目id'
    },
    status: {
      type: dataTypes.INTEGER,
      defaultValue: 0,
      comment: '状态：0=停用;1=启用'
    },
    recent_run_at: {
      type: dataTypes.DATE,
      comment: '最近调度时间'
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'sugo_tag_hql',
    freezeTableName: true,
    underscored: true,
    timestamps: true
  })
}
