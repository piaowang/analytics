import { generate } from 'shortid'

export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketingPushLandPage',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      name: {
        type: dataTypes.STRING(50),
        comment: '落地页中文名称'
      },
      code: {
        type: dataTypes.STRING(50),
        comment: '落地页编码'
      },
      created_by: {
        type: dataTypes.STRING(32)
      },
      updated_by: {
        type: dataTypes.STRING(32)
      }
    },
    {
      tableName: 'sugo_marketing_push_land_page',
      timestamps: true,
      underscored: true
    }
  )
  return model
}
