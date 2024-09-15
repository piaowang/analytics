import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  // 大屏投影控制配置，目前应该只有一条数据
  const SugoLiveScreenControl = sequelize.define('SugoLiveScreenControl', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    },
    // title: {
    //   type: dataTypes.STRING,
    //   comment: '当前控制配置名称'
    // },
    currentThemes: {
      field: 'current_themes',
      type: dataTypes.JSONB,
      defaultValue: [],
      comment: '当前轮播主题列表'
    },
    screenInfos: {
      field: 'screen_infos',
      type: dataTypes.JSONB,
      defaultValue: {},
      comment: '登陆过的屏幕ID'
    },
    // currentThemeOrder: {
    //   type: dataTypes.JSONB,
    //   defaultValue: [],
    //   comment: '当前主题表的顺序'
    // },
    timer: {
      type: dataTypes.INTEGER,
      defaultValue: 60,
      comment: '主题轮播时间/分钟'
    }
  },
  {
    tableName: 'sugo_livescreen_control',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      // SugoLiveScreenControl.belongsTo(models.SugoLiveScreenControlTheme, {foreignKey: 'current_theme_id'})
    }
  })
  return SugoLiveScreenControl
}
