import { generate } from 'shortid'

// 内容上看 该表存的是第三方的数据
export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketBrainCooperate',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      store_id: {
        type: dataTypes.STRING(100),
        comment: '门店ID'
      },
      company_id: {
        type: dataTypes.STRING(100),
        comment: '场景ID'
      },
      corpid: {
        type: dataTypes.STRING(100),
        comment: '企业微信 企业ID'
      },
      custom_contact_secret: {
        type: dataTypes.STRING(100),
        comment: '企业微信 客户联系secret https://work.weixin.qq.com/api/doc/90000/90135/90665#secret'
      },
      address_book_secret: {
        type: dataTypes.STRING(100),
        comment: '企业微信 通讯录secret https://work.weixin.qq.com/api/doc/90000/90135/90665#secret'
      },
      marketing_secret: {
        type: dataTypes.STRING(50),
        comment: '自定义应用 智能营销secret'
      },
      enterprise_app_id: {
        type: dataTypes.STRING(50),
        comment: '自定义应用 智能营销应用id'
      },
      name: {
        type: dataTypes.TEXT,
        comment: '企业名称  (暂时冗余 该表为人工录入表 辅助查询和阅读)'
      },
      appid: {
        type: dataTypes.STRING(100),
        comment: '微信公众号id'
      },
      app_secret: {
        type: dataTypes.STRING(100),
        comment: '微信公众号secret'
      },
      created_by: {
        type: dataTypes.STRING(100)
      },
      updated_by: {
        type: dataTypes.STRING(100)
      }
    },
    {
      tableName: 'sugo_market_brain_cooperate',
      timestamps: true,
      underscored: true
    }
  )
  return model
}
