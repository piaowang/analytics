import {generate} from 'shortid'

/**
 * 大屏投影控制管理-投影主题配置表
 */
export default (sequelize, dataTypes) => {
  const SugoLiveScreenControlTheme = sequelize.define('SugoLiveScreenControlTheme',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      title: {
        type: dataTypes.STRING,
        comment: '主题名称'
      },
      screenCount: {
        field: 'screen_count',
        type: dataTypes.INTEGER,
        defaultValue: 4,
        comment: '轮播屏幕数量（块）'
      },
      contains: {
        type: dataTypes.JSONB,
        defaultValue: [],
        comment: '屏幕对应已发布大屏的映射配置'
      },
      timer: {
        type: dataTypes.INTEGER,
        comment: '设置轮播时间（秒）'
      },
      desc: {
        type: dataTypes.STRING(500),
        comment: '备注'
      }
    },
    {
      tableName: 'sugo_livescreen_control_theme',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        //SugoLiveScreenControlTheme.hasMany(models.SugoLiveScreenControl, {foreignKey: 'current_theme_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return SugoLiveScreenControlTheme
}
