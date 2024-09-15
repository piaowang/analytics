import { generate } from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoLivescreenRole = sequelize.define('SugoLivescreenRole',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      role_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_role',
          key: 'id'
        }
      },
      status: {
        type: dataTypes.INTEGER
      },
      dashboard_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_livescreen',
          key: 'id'
        }
      },
      livescreen_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_livescreen',
          key: 'id'
        }
      },
      type: {
        type: dataTypes.INTEGER
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      meta: {
        type: dataTypes.JSON,
        comment: '其他信息，可能包括更具体的权限'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_livescreen_role',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoLivescreenRole.belongsTo(models.SugoRole, { foreignKey: 'role_id' })
        SugoLivescreenRole.belongsTo(models.SugoLiveScreen, { foreignKey: 'dashboard_id' })
      }
    }
  )
  return SugoLivescreenRole
}
