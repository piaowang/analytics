/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:43:56
 * @description 智能营销-结果表
 */
import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketingResults',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      module_id: {
        type: dataTypes.STRING(32),
        comment: '活动/事件ID'
      },
      send_time: {
        type: dataTypes.DATE,
        comment: '发送时间'
      },
      send_target_total: {
        type: dataTypes.FLOAT,
        comment: '发送组目标用户数'
      },
      send_open_total: {
        type: dataTypes.FLOAT,
        comment: '发送组打开用户数'
      },
      send_revisit_total: {
        type: dataTypes.FLOAT,
        comment: '发送组回访用户数'
      },
      contrast_target_total: {
        type: dataTypes.FLOAT,
        comment: '对比组目标用户数'
      },
      contrast_revisit_total: {
        type: dataTypes.FLOAT,
        comment: '对比组回访用户数'
      },
      project_id: {
        type: dataTypes.STRING(32),
        comment: '项目ID'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_marketing_results',
      timestamps: true,
      underscored: true
    }
  )
  return model
}
