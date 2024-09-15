import { generate } from 'shortid'

// 内容上看 该表存的是第三方的数据
export default (sequelize, dataTypes) => {
  const model = sequelize.define('MarketBrainStaff',
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
      name: {
        type: dataTypes.STRING(100),
        comment: '姓名'
      },
      mobile: {
        type: dataTypes.STRING(50),
        comment: '手机号'
      },
      staff_id: {
        type: dataTypes.STRING(100),
        comment: '员工id'
      },
      shareid: {
        type: dataTypes.STRING(100),
        comment: '员工的分享链接id'
      },
      userid: {
        type: dataTypes.STRING(100),
        comment: '企微id 除了这个 其他全部手工填写'
      },
      staff_position: {
        type: dataTypes.STRING(100),
        comment: '员工职位 系统初始化'
      },
      contact_me: {
        type: dataTypes.TEXT,
        comment: '联系我 二维码'
      },
      contact_me_config: {
        type: dataTypes.TEXT,
        comment: '联系我 config api申请的需要保存'
      },
      created_by: {
        type: dataTypes.STRING(100)
      },
      updated_by: {
        type: dataTypes.STRING(100)
      }
    },
    {
      tableName: 'sugo_market_brain_staff',
      timestamps: true,
      underscored: true
    }
  )
  return model
}
