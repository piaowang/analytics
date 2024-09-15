export default (sequelize, dataTypes) => {
  return sequelize.define('MsgLog',
    {
      result: {
        type: dataTypes.JSONB,
        comment: '发送短信接口返回的json',
        defaultValue: {}
      },
      to: {
        type: dataTypes.STRING(500),
        comment: '发送目标电话号码，格式： `13322223333,15522223333`'
      },
      templateCode: {
        field: 'templateCode',
        type: dataTypes.STRING(100),
        comment: '阿里云模板代码'
      }
    },
    {
      tableName: 'msg_log',
      timestamps: true,
      underscored: true
    }
  )
}
