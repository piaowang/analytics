import { RefExpression } from 'sugo-plywood'
import conf from '../config'
import _ from 'lodash'

function upperCaseRefs(expression) {
  return expression.substitute((ex) => {
    if (ex instanceof RefExpression) {
      let v = ex.valueOf()
      v.name = v.name.toUpperCase()
      return new RefExpression(v)
    }
    return null
  })
}

export function executeSQLParse(sqlParse, context, timezone) {
  let { expression, database } = sqlParse
  if (database && database.toLowerCase() === 'information_schema') {
    expression = upperCaseRefs(expression) // the context variables are hardcoded from plyql so it makes sense to force upper here.
  }

  return expression.compute(context, { timezone })
}

export function executeSQLParseStream(sqlParse, context, timezone) {
  let { expression, database } = sqlParse
  if (database && database.toLowerCase() === 'information_schema') {
    expression = upperCaseRefs(expression) // the context variables are hardcoded from plyql so it makes sense to force upper here.
  }

  return expression.computeStream(context, { timezone })
}

export function executePlywood(expression, context, timezone) {
  const downloadLimit = _.last((_.get(conf, 'site.downloadLimit') || '100,500').split(','))
  
  return expression.compute(context, {
    timezone,
    maxQueries: downloadLimit ? +downloadLimit + 2 : undefined // +2 是因为有一次是全局统计，有一次是第一维度 groupBy，暂不考虑三个维度或以上的 groupBy
  })
}

export function executePlywoodStream(expression, context, timezone) {
  return expression.computeStream(context, { timezone })
}
