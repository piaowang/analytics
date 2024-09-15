import {generate} from 'shortid'
export default (sequelize, dataTypes) => {
  const SugoUserSlice = sequelize.define('SugoUserSlice',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      user_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'sugo_user',
          key: 'id'
        }
      },
      slice_id: {
        type: dataTypes.STRING(32),
        references: {
          model: 'slices',
          key: 'id'
        }
      },
      company_id: {
        type: dataTypes.STRING(32)
      },
      meta: {
        type: dataTypes.JSON,
        comment: '其他信息，可能包括更具体的权限'
      }
    },
    {
      tableName: 'sugo_user_slice',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        SugoUserSlice.belongsTo(models.SugoUser, {foreignKey: 'user_id'})
        SugoUserSlice.belongsTo(models.Slices, {foreignKey: 'slice_id'})
      }
    }
  )
  return SugoUserSlice
}
