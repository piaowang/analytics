import {generate} from 'shortid'

/**
 * 标签计算管理表
 * @typedef {object} SugoTagDictionary
 * @property {string} id
 * @property {string} title
 * @property {Object} params
 * @property {string} project_id
 * @property {number} type
 * @property {number} status
 * @property {date} recent_run_at
 * @property {date} updated_by
 * @property {string} created_by
 * @property {date} updated_at
 * @property {string} created_at
 */
export default (sequelize, dataTypes) => {
  return sequelize.define('SugoUserTagUpdateTask', {
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
    params: {
      type: dataTypes.JSONB,
      defaultValue: {},
      comment: '不固定的参数，备注，调度任务信息等'
    },
    project_id: {
      type: dataTypes.STRING(32),
      allowNull: false,
      references: {
        model: 'sugo_projects',
        key: 'id'
      },
      comment: '项目id'
    },
    type: {
      type: dataTypes.INTEGER,
      defaultValue: 0,
      comment: '任务类别，详见 src/common/constants UserTagUpdateTaskTypeEnum'
    },
    status: {
      type: dataTypes.INTEGER,
      defaultValue: 0,
      comment: '任务状态，预留字段'
    },
    recent_run_at: {
      type: dataTypes.DATE,
      comment: '最近运行时间'
    },
    created_by: {
      type: dataTypes.STRING(32)
    },
    updated_by: {
      type: dataTypes.STRING(32)
    }
  }, {
    tableName: 'sugo_user_tag_update_tasks',
    freezeTableName: true,
    underscored: true,
    timestamps: true,
    associate: function (models) {
      models.SugoUserTagUpdateTask.belongsTo(models.SugoProjects, {foreignKey: 'project_id'})
    }
  })
}
