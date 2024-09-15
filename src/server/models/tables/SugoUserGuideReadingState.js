/**
 * Created by heganjie on 2017/7/5.
 * 用户向导读取状态表
 * 用户点击"不在提醒"后会标记在这个表，下次不会再弹出某个向导或提示
 */

import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoUserGuideReadingStates = sequelize.define('SugoUserGuideReadingStates',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      guide_name: {
        type: dataTypes.STRING(255)
      },
      guide_version: {
        type: dataTypes.INTEGER,
        defaultValue: 0,
        comment: '已读向导版本'
      },
      user_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_user',
          key: 'id'
        }
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      },
      company_id: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_user_guide_reading_states',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoUserGuideReadingStates.belongsTo(models.SugoUser, {foreignKey: 'user_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoUserGuideReadingStates
}
