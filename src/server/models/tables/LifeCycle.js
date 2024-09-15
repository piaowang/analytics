/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:43:48
 * @description 用户生命周期表
 */
import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('LifeCycles',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      group_by_name: {
        type: dataTypes.STRING(32),
        comment: '用户ID维度名称'
      },
      project_id: {
        type: dataTypes.STRING(32),
        comment: '项目ID '
      },
      relatedbehaviorprojectid: {
        type: dataTypes.STRING(32),
        comment: '关联行为项目ID'
      },
      relatedusertagprojectid: {
        type: dataTypes.STRING(32),
        comment: '关联标签项目ID'
      },
      stages: {
        type: dataTypes.JSONB,
        defaultValue: [
          // { stage(用户群名称), description, segment_id }
        ],
        comment: '生命周期阶段设置'
      },
      trigger_timer: {
        type: dataTypes.JSONB,
        comment: '每天定时触发时间表达式'
      },
      status: {
        type: dataTypes.JSONB,
        comment: '生命周期运行状态',
        defaultValue: {
          state: '',
          error: ''
        }
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
    },
    {
      tableName: 'sugo_life_cycles',
      timestamps: true,
      underscored: true,
      associate (models) {
        model.hasMany(models.LifeCycleMarketingModel,  { foreignKey: 'life_cycle_id' })
      }
    }
  )
  return model
}
