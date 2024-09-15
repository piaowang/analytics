import { generate } from 'shortid'

// 内容上看 该表存的是第三方的数据
export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketBrainCustom',
    {
      id: {
        type: dataTypes.STRING(32),
        primaryKey: true,
        defaultValue: generate
      },
      openid: {
        type: dataTypes.STRING(100),
        comment: '企微openid'
      },
      userid: {
        type: dataTypes.STRING(100),
        comment: '企微id'
      },
      sa_id: {
        type: dataTypes.STRING(100),
        comment: '导购（员工）userid 现在设计为1对1 如果1对多则通过多条记录解决 不设计为数组'
      },
      unionid: {
        type: dataTypes.STRING(100),
        comment: '腾讯唯一id'
      },
      descripe: {
        type: dataTypes.TEXT,
        comment: '任意值 企微接口获取 用来和tindex的记录匹配的'
      },
      created_by: {
        type: dataTypes.STRING(100)
      },
      updated_by: {
        type: dataTypes.STRING(100)
      }
    },
    {
      tableName: 'sugo_market_brain_custom',
      timestamps: true,
      underscored: true
    }
  )
  return model
}
