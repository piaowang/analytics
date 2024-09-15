import {generate} from 'shortid'

export default (sequelize, dataTypes) => {
  const SugoShareManager = sequelize.define('SugoShareManager', {
    id: {
      type: dataTypes.STRING(32),
      primaryKey: true,
      defaultValue: generate
    }, 
    screen_id: {
      type: dataTypes.STRING(32),
      comment: '大屏id',
      references: {
        model: 'sugo_livescreen',
        key: 'id'
      }
    },
    type: {
      type: dataTypes.INTEGER,
      comment: '分享类型，0=公开，1=加密，2=停止'
    },
    status: {
      type: dataTypes.INTEGER,
      comment: '分享状态，0=失效，1=生效'
    },
    model_type: {
      type: dataTypes.INTEGER,
      comment: '模块类型'
    },
    share_time: {
      type: dataTypes.DATE,
      comment: '分享时间'
    },
    deadline: {
      type: dataTypes.DATE,
      comment: '失效日期'
    },
    password: {
      type: dataTypes.STRING(32),
      comment: '分享密码'
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
    tableName: 'sugo_share_manager',
    timestamps: true,
    underscored: true,
    associate: function (models) {
      SugoShareManager.belongsTo(models.SugoLiveScreen, {foreignKey: 'screen_id'})
    }
  })
  return SugoShareManager
}
