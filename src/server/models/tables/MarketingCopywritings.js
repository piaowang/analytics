/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 00:21:16
 * @description 智能营销-文案表
 */
import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketingCopywritings',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      title: {
        type: dataTypes.STRING(50),
        comment: '标题'
      },
      content: {
        type: dataTypes.TEXT,
        comment: '文案内容'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_marketing_copywritings',
      timestamps: true,
      underscored: true
    }
  )
  return model
}
