/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-16 18:43:51
 * @description 活动营销中心-活动分组表
 */
import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketingActivityGroups',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(50),
        comment: '分组名称'
      },
      remark: {
        type: dataTypes.TEXT,
        comment: '分组说明'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_marketing_activity_groups',
      timestamps: true,
      underscored: true,
      associate: function (models) {
        model.hasMany(models.MarketingActivitys, {foreignKey: 'group_id', onDelete: 'cascade', hooks: true})
      }
    }
  )
  return model
}
