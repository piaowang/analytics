import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoLiveScreenExamine = sequelize.define('SugoLiveScreenExamine',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      live_screen_id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        references: {
          model: 'sugo_livescreen',
          key: 'id'
        }
      },
      status: {
        type: dataTypes.INTEGER,
        comment: '0: 还未提交审核， 1: 正在等待审核， 2: 审核已经通过， 3: 审核没有通过',
        defaultValue: 0
      },
      examine_describe: {
        type: dataTypes.STRING(255)
      },
      fail_describe: {
        type: dataTypes.STRING(255)
      },
      examine_user: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_user',
          key: 'id'
        }
      }
    },
    {
      tableName: 'sugo_live_screen_examine',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoLiveScreenExamine.belongsTo(models.SugoUser, {foreignKey: 'examine_user'})
        SugoLiveScreenExamine.belongsTo(models.SugoLiveScreen, {foreignKey: 'live_screen_id'})
      }
    }
  )
  return SugoLiveScreenExamine
}
