import _ from 'lodash'

const returnDict = {
  '操作失败：请检查数据库外键约束关系': /foreign key|外键/i
}

function handleMsg(errMsg) {
  return _.findKey(returnDict, v => v.test(errMsg)) || errMsg
}

export async function globalErrorHandler(ctx, next) {
  try {
    await next()
  } catch (e) {
    // sequelize 报错时打印出sql
    if (e.sql) {
      console.error('ERROR SQL ==> ', e.sql)
    }
    console.error(e.stack)
    let { path } = ctx
    if (
      /^\/app\//.test(path) ||
      /^\/api\//.test(path) ||
      /^\/common\//.test(path)
    ) {
      ctx.status = 500
      ctx.body = {
        error: handleMsg(e.message || e.stack)
      }
    } else {
      //500 page
      ctx.status = 500
      ctx.local.error = e
      ctx.render('500', ctx.local)
    }
  }
}
