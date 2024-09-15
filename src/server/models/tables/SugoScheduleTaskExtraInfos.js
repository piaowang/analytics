
import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoScheduleTaskExtraInfo = sequelize.define('SugoScheduleTaskExtraInfo',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      project_id: {
        type: dataTypes.STRING(32),
        allowNull: false,
        references: {
          model: 'sugo_projects',
          key: 'id'
        }
      },
      task_id: {
        type: dataTypes.INTEGER,
        allowNull: false
      },
      related_tags: {
        type: dataTypes.JSONB,
        defaultValue: [] // ['dimName', ...]
      },
      created_by: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_user',
          key: 'id'
        }
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      company_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_schedule_task_extra_infos',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoScheduleTaskExtraInfo.belongsTo(models.SugoProjects, {foreignKey: 'project_id'})
      }
    }
  )
  return SugoScheduleTaskExtraInfo
}
