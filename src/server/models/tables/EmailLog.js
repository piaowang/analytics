
export default (sequelize, dataTypes) => {
  const Log = sequelize.define('EmailLog',
    {
      result: {
        type: dataTypes.JSONB,
        comment: '发送邮件接口返回的json',
        defaultValue: {}
      },
      from: {
        type: dataTypes.STRING(500),
        comment: '发件地址，格式： `xx@dd.com`'
      },
      to: {
        type: dataTypes.STRING(1000),
        comment: '收件地址，格式： `xx@dd.com,gg@dd.cn`'
      },
      body: {
        type: dataTypes.STRING(5000),
        comment: '邮件正文'
      },
      subject: {
        type: dataTypes.STRING(500),
        comment: '邮件标题'
      }
    },
    {
      tableName: 'email_log',
      timestamps: true,
      underscored: true
    }
  )
  return Log
}
