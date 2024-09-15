import conf from '../config'
import db from '../models'
const {
  resourceLimit,
  site: {
    customerServicePhoneNumber
  }
} = conf

//limit modelName
const limitMap = {
  slice: 'Slices',
  dashboard: 'Dashboards',
  usergroup: 'Segment',
  retention: 'SugoRetentions',
  funnel: 'SugoFunnels',
  dimension: 'SugoDimensions',
  measure: 'SugoMeasures',
  user: 'SugoUser',
  role: 'SugoRole',
  datasource: 'SugoProjects',
  businessdimension: 'SugoDimensions'
}

const limitNameMap = {
  slice: '单图',
  dashboard: '看板',
  usergroup: '用户分群',
  retention: '留存',
  funnel: '漏斗',
  dimension: '维度',
  measure: '指标',
  user: '用户',
  role: '角色',
  datasource: '项目',
  businessdimension: '业务维度'
}

export async function checkLimit(ctx, type, where = {}) {

  if (!type || !limitMap[type]) {
    throw new Error('资源限制:type not right')
  }
  let modelName = limitMap[type]
  let {user} = ctx.session
  let {company} = user
  let query = {
    where: {
      company_id: company.id,
      ...where
    }
  }
  let companyType = company.type
  let limit = resourceLimit[companyType][type]
  let count = await db[modelName].count(query)
  let contactStr = ` ,如需要创建更多请联系我们客服，电话${customerServicePhoneNumber}`
  let errStr = `已经达到[${limitNameMap[type]}]资源限制[${limit}]${customerServicePhoneNumber ? contactStr : ''}`
  // if (count >= limit) throw new Error(errStr)
  
}
