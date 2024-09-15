import db from '../models'
import _ from 'lodash'
import { Expression } from 'sugo-plywood'
import * as plyqlExecutor from '../utils/plyql-executor'
import moment from 'moment'
import { decompressUrlQuery, immutateUpdate } from '../../common/sugo-utils'
import { returnError, returnResult, setCacheControlByTimeRange } from '../utils/helper'
import { checkLimit } from '../utils/resouce-limit'
import DruidQueryService, { decryptFlt, transformToOldQueryFormat } from '../services/druid-query.service'
import SlicesService from '../services/slices.service'
import { convertDateType, isRelative } from '../../common/param-transform'
import { getExpressionComputeContext } from '../utils/plywood-facade'
import { convertContainsByDBType } from './convert-contains-where'
import SugoOfflineCalcDataSourcesService from '../services/sugo-offline-calc-data-sources.service'
import SugoOfflineCalcTablesService from '../services/sugo-offline-calc-tables.service'
import { rawSQLQueryForOracle } from '../utils/oracle-facade'
import { rawSQLQueryForSQLServer } from '../utils/sql-server-facade'
import { rawSQLQueryForDb2Server } from '../utils/db2-facade'
import { rawSQLQueryForPG } from '../utils/postgres-facade'
import { rawSQLQueryForMysql } from '../utils/mysql-facade'
import { externalDataSourceFilterToSql, getHasPromessinInstitutions, quoteIdentifier } from '../../common/slice-external-datasource-filter'
import XorUtils from '../../common/xor-utils'
import { OfflineCalcDataSourceTypeEnum } from '../../common/constants'
import config from '../config'
import InstitutionsService from '../services/institutions.service'
import { AUTHORIZATION_TYPE, AUTHORIZATION_PERMISSIONS_TYPE } from '../../common/constants'
import AuthorizationServices from '../services/sugo-authorization.service'
// import { raw } from '../utils/hive-facade'
import { getProjectsByDataSourceIds } from '../services/sugo-project.service'

// if (!chronoshift_1.WallTime.rules) {
//   let tzData = require('chronoshift/lib/walltime/walltime-data.js')
//   chronoshift_1.WallTime.init(tzData.rules, tzData.zones)
// }

const commonInclude = {
  model: db.Slices,
  attributes: ['id', 'slice_name', 'druid_datasource_id', 'child_project_id', 'datasource_name', 'params', 'created_by', 'updated_at', 'tags', 'notes', 'author'],
  include: {
    model: db.SugoUser,
    attributes: ['id', 'username', 'first_name']
  },
  order: [['updated_at', 'ASC']]
}

const generateInstitutionsFilter = async (session, institutionsField, isDruid = false, dbType) => {
  if (config.site.enableExternalDataSourcesInstitutions && institutionsField) {
    const institutionsList = await new InstitutionsService().findAll({}, { raw: true })
    let institutions_id = _.get(session, 'user.role_institutions', [])
    institutions_id = institutions_id.length ? institutions_id : _.get(session, 'user.institutions_id', '')
    let roleInst = getHasPromessinInstitutions(institutionsList, institutions_id)
    if (!roleInst.length) {
      // return null
      roleInst = [{ serial_number: '0W067' }]
    }
    return isDruid
      ? { col: institutionsField, op: 'in', eq: roleInst.map(p => p.serial_number), type: 'string' }
      : `${quoteIdentifier(dbType, institutionsField)} in ('${roleInst.map(p => p.serial_number).join("','")}')`
  }
  return null
}

export async function addFiltersByRole(ctx, queryObj) {
  const currUserRoles = _.get(ctx.session, 'user.SugoRoles')
  if (currUserRoles && queryObj.druid_datasource_id) {
    const project = _.get(await getProjectsByDataSourceIds([queryObj.druid_datasource_id]), [0])
    let preAddFilters = _.flatMap(currUserRoles, role => {
      return _.get(project, ['extra_params', 'roleFiltersDict', role.id]) || []
    })
    if (!_.isEmpty(preAddFilters)) {
      return immutateUpdate(queryObj, 'filters', currFilters => [...(currFilters || []), ...preAddFilters])
    }
  }
  return queryObj
}

export default {
  shareSlice: async ctx => {
    let { sliceId, roleIds } = ctx.q
    let { id, company_id } = ctx.session.user

    let q = {
      where: {
        id: sliceId,
        company_id,
        created_by: id
      }
    }

    if (!sliceId) {
      return returnError(ctx, '别闹, 这参数不对', 404)
    }

    let hasSlice = await db.Slices.findOne(q)

    if (!hasSlice) return returnError(ctx, '您无权操作或者资源不存在', 404)

    //check role exist
    if (roleIds.length) {
      let count1 = await db.SugoRole.count({
        where: {
          company_id,
          id: {
            $in: roleIds
          }
        }
      })
      if (count1 !== roleIds.length) return returnError(ctx, '您无权操作或者角色资源不存在，请刷新后重试', 404)
    }

    let res = await db.client.transaction(async t => {
      let target = {
        transaction: t
      }
      await db.SugoRoleSlice.destroy({
        where: {
          slice_id: sliceId,
          company_id
        },
        ...target
      })
      for (let role_id of roleIds) {
        let defaults = {
          slice_id: sliceId,
          company_id,
          role_id
        }
        await db.SugoRoleSlice.findOrCreate({
          where: defaults,
          defaults,
          ...target
        })
      }
    })

    returnResult(ctx, res)
  },

  querySlices: async ctx => {
    let { user } = ctx.session
    let { company_id, id, SugoRoles } = user
    let roleIds = SugoRoles.map(r => r.id)
    let q1 = _.pick(commonInclude, ['attributes', 'include'])
    q1.where = {
      company_id,
      created_by: id
    }
    q1.include = [
      {
        model: db.DashboardSlices,
        required: false
      }
    ]
    const slicesCreateByUser = await db.Slices.findAll({ ...q1, raw: true })
    //获取授权的单图
    const authorizationSlice = await AuthorizationServices.getInstance().getAuthorizationType(AUTHORIZATION_TYPE.slice, roleIds)
    //获取授权的看板
    const authorizationDashboard = await AuthorizationServices.getInstance().getAuthorizationType(AUTHORIZATION_TYPE.dashboard, roleIds)
    //获取看板的单图
    const dashboardsSlices = await db.DashboardSlices.findAll({ where: { dashboard_id: { $in: _.keys(authorizationDashboard) } }, raw: true })

    const slicesIds = _.concat(
      _.keys(authorizationSlice),
      dashboardsSlices.map(p => p.slice_id)
    )
    const authorizationSliceInfo = await db.Slices.findAll({ where: { id: { $in: slicesIds } }, raw: true })
    let slices = _.uniqBy(
      [
        ...slicesCreateByUser.map(p => {
          return {
            ...p,
            authorization_permissions_type: AUTHORIZATION_PERMISSIONS_TYPE.owner
          }
        }),
        ...authorizationSliceInfo.map(p => {
          return {
            ...p,
            authorization_permissions_type: _.get(authorizationSlice, `${p.id}`, 0)
          }
        })
      ],
      'id'
    )

    let ids = slices.map(d => d.id)
    let subscribes = await db.SugoSubscribe.findAll({
      where: {
        user_id: id,
        slice_id: {
          $in: ids
        }
      }
    })

    let overviews = await db.SugoOverview.findAll({
      where: {
        slice_id: {
          $in: ids
        },
        company_id
      }
    })

    let sids = slices.filter(s => s.created_by === id).map(s => s.id)

    let shareRoles = await db.SugoRoleSlice.findAll({
      where: {
        slice_id: {
          $in: sids
        }
      }
    })

    // 单图列表根据数据源权限来限制查询
    let permissionDataSourceIds = (
      await db.SugoDatasources.findAll({
        where: {
          $or: roleIds.map(roleId => convertContainsByDBType('role_ids', roleId))
        },
        attributes: ['id', 'role_ids'],
        raw: true
      })
    ).map(ds => ds.id)
    let permissionChildProjectIds = (
      await db.SugoChildProjects.findAll({
        where: {
          $or: roleIds.map(roleId => convertContainsByDBType('role_ids', roleId))
        },
        attributes: ['id', 'role_ids'],
        raw: true
      })
    ).map(cp => cp.id)
    let permissionDataSourceIdsSet = new Set(permissionDataSourceIds)
    let permissionChildProjectIdsSet = new Set(permissionChildProjectIds)
    let slicesFilterByDataSourceRole = slices.filter(s => {
      return permissionDataSourceIdsSet.has(s.druid_datasource_id) || permissionChildProjectIdsSet.has(s.child_project_id)
    })

    ctx.body = {
      slices: slicesFilterByDataSourceRole,
      subscribes,
      overviews,
      shareRoles
    }
  },

  querySliceForPublic: async ctx => {
    if (!ctx.params.id) {
      returnError(ctx, 'no slice id provided')
      return
    }
    let slice = await db.Slices.findOne({
      where: {
        id: ctx.params.id
      },
      attributes: ['id', 'slice_name', 'druid_datasource_id', 'datasource_name', 'params']
    })
    returnResult(ctx, slice)
  },
  // 查询所有单图列表
  querySliceListForPublic: async ctx => {
    if (!ctx.params.dataSourceName) {
      returnError(ctx, 'no dataSource id provided')
      return
    }
    let slices = await db.Slices.findAll({
      where: {
        druid_datasource_id: ctx.params.dataSourceName
      },
      attributes: ['id', 'slice_name', 'druid_datasource_id', 'datasource_name', 'params'],
      raw: true
    })

    let metrics = await db.SugoMeasures.findAll({
      where: {
        parentId: ctx.params.dataSourceName
      },
      attributes: ['name', 'title', 'pattern'],
      raw: true
    })

    returnResult(ctx, slices)
    ctx.body.metrics = metrics
  },

  querySliceConfig: async ctx => {
    let { user } = ctx.session
    let { company_id, id, SugoRoles } = user
    let roleIds = SugoRoles.map(r => r.id)
    //获取当前单图的授权
    const authorizationSlice = await AuthorizationServices.getInstance().getAuthorizationType(AUTHORIZATION_TYPE.slice, roleIds, ctx.params.id)
    //获取当前单图关联的看板
    let dashboardIds = await db.DashboardSlices.findAll({ where: { slice_id: ctx.params.id }, raw: true })
    //获取看板的授权
    const authorizationDashboard = await AuthorizationServices.getInstance().getAuthorizationType(
      AUTHORIZATION_TYPE.dashboard,
      roleIds,
      dashboardIds.map(p => p.dashboard_id)
    )
    // 获取单图的权限 取最大的权限 （1：只读，2：编辑）
    const sliceAuthorization = _.max([..._.values(authorizationDashboard), _.get(authorizationSlice, ctx.params.id, 0)])

    //获取有权限的单图信息
    let slice = await db.Slices.findOne({
      where: {
        id: ctx.params.id,
        company_id,
        ...(sliceAuthorization ? {} : { created_by: id }) // 没有权限就通过创建人过滤
      },
      include: commonInclude.include
    })

    if (!slice) return returnError(ctx, '您没有权限访问这个单图或者单图不存在', 404)
    slice = slice.get({ plain: true })

    let subscribe = await db.SugoSubscribe.findOne({
      where: {
        user_id: id,
        slice_id: slice.id
      }
    })

    let overview = await db.SugoOverview.findOne({
      where: {
        slice_id: slice.id,
        company_id
      }
    })

    let shareRoles = await db.SugoRoleSlice.findAll({
      where: {
        slice_id: slice.id
      }
    })

    ctx.body = {
      ...slice,
      authorization_permissions_type: slice.created_by === id ? AUTHORIZATION_PERMISSIONS_TYPE.owner : sliceAuthorization,
      subscribed: !!subscribe,
      inOverview: !!overview,
      shareRoles: shareRoles.map(s => s.role_id)
    }
  },

  createSlice: async ctx => {
    let slice = ctx.q

    let { user } = ctx.session
    let { company_id, id, username } = user
    let res

    let where = {}
    const { slice_name, druid_datasource_id } = slice

    if (!slice_name || slice_name.trim() === '') {
      return returnError(ctx, '单图名称不能为空', 400)
    }

    if (!druid_datasource_id || druid_datasource_id.trim() === '') {
      return returnError(ctx, 'Druid 项目 ID 不能为空', 400)
    }

    if (slice.id) {
      where = _.defaultsDeep(
        {
          id: {
            $ne: slice.id
          }
        },
        where
      )
    }

    where = _.defaultsDeep(
      {
        slice_name: slice_name,
        druid_datasource_id: druid_datasource_id,
        created_by: id
      },
      where
    )

    let slices = await SlicesService.findAllSlices(where)

    if (slices.length !== 0) return returnError(ctx, '保存失败：存在同名的单图', 409)

    if (slice.id) {
      delete slice.company_id
      delete slice.created_by
      slice.updated_by = id
      slice.author = username
      res = await db.Slices.update(slice, {
        where: {
          id: slice.id
          // created_by: id,
          // company_id
        }
      })
    } else {
      await checkLimit(ctx, 'slice')
      // 保存新创建的单图
      //todo use it
      slice.created_by = id
      slice.updated_by = id
      slice.company_id = company_id
      slice.author = username
      res = await db.Slices.create(slice)
    }

    returnResult(ctx, res)
  },

  updataSliceTag: async ctx => {
    let { query } = ctx.q
    let { user } = ctx.session
    let { company_id } = user
    let res

    const { id: sliceId, tags } = query

    if (sliceId) {
      res = await db.Slices.update(
        { tags, company_id },
        {
          where: { id: sliceId },
          fields: ['tags', 'company_id']
        }
      )
    }

    ctx.body = res
  },

  deleteSlices: async ctx => {
    let { ids } = ctx.q || {}
    let { user } = ctx.session
    let { company_id, id } = user
    let q = {
      where: {
        id: {
          $in: ids
        },
        company_id,
        created_by: id
      }
    }
    let indb = await db.Slices.findAll(q)
    if (!indb.length) return returnError(ctx, '您无权删除或者资源不存在', 404)

    let res = await db.client.transaction(async t => {
      let query = {
        where: {
          id: {
            $in: ids
          },
          company_id,
          created_by: id
        },
        transaction: t
      }
      let query0 = {
        where: {
          slice_id: {
            $in: ids
          }
        },
        transaction: t
      }

      //let dashbs = await db.DashboardSlices.findAll(query0)
      //let dashbIds = _.uniq(dashbs.map(d => d.dashboard_id))
      await db.DashboardSlices.destroy(query0)
      await db.SugoSubscribe.destroy(query0)
      await db.SugoOverview.destroy({
        ...query0,
        company_id
      })
      await db.SugoRoleSlice.destroy({
        ...query0,
        company_id
      })

      await db.Slices.destroy(query)

      //检查看板是不是一个单图也没有了，如果这样就删除看板
      // if (dashbIds.length) {
      //   for (let dashboard_id of dashbIds) {
      //     let dashbSliceLen = await db.DashboardSlices.count({
      //       where: {
      //         dashboard_id
      //       },
      //       transaction: t
      //     })

      //     if (!dashbSliceLen) {
      //       await db.SugoSubscribe.destroy({
      //         where: {
      //           dashboard_id
      //         },
      //         transaction: t
      //       })
      //       await db.Dashboards.destroy({
      //         where: {
      //           id: dashboard_id
      //         },
      //         transaction: t
      //       })
      //     }
      //   }
      // }
    })

    returnResult(ctx, res)
  },

  queryExternalDataSource: async ctx => {
    let { offline_calc_table_id, dimensions = [], metrics = [], filters, dimensionExtraSettings = [], tempMetricDict } = ctx.q
    const metricsFields = []
    const metricNames = []
    const tableInfo = await SugoOfflineCalcTablesService.getInstance().findOne({ id: offline_calc_table_id }, { raw: true })
    if (_.isEmpty(tableInfo)) {
      return returnResult(ctx, [])
    }

    const dataSourceInfo = await SugoOfflineCalcDataSourcesService.getInstance().findOne({ id: tableInfo.data_source_id }, { raw: true })
    if (_.isEmpty(dataSourceInfo)) {
      return returnResult(ctx, [])
    }

    const dbType = dataSourceInfo.type

    if (metrics.length && metrics[0] === 'total') {
      metricsFields.push(`count(*) as ${quoteIdentifier(dbType, 'total')}`)
      metricNames.push('total')
    }

    const orderby = dimensionExtraSettings.length
      ? dimensionExtraSettings.filter(_.identity).map(p => `${quoteIdentifier(dbType, p.sortCol)} ${p.sortDirect}`)
      : [`${quoteIdentifier(dbType, metrics[0])} desc`]

    _.forEach(_.keys(tempMetricDict), p => {
      const { aggregationType, dimension } = tempMetricDict[p]
      let val = `${aggregationType}(${quoteIdentifier(dbType, dimension)}) as ${quoteIdentifier(dbType, p)}`
      metricsFields.push(val)
      metricNames.push(p)
    })
    let { sql: where, binds } = externalDataSourceFilterToSql(filters, dbType)

    const field = _.get(tableInfo, 'params.fieldInfos', []).find(p => p.is_institutions) || {}
    const institutionsWhere = await generateInstitutionsFilter(ctx.session, field.field, false, dbType)
    // 判断是否启用机构过滤数据
    if (institutionsWhere) {
      // eslint-disable-next-line no-extra-boolean-cast
      where = `${institutionsWhere} ${!!where ? ' and ' : ' '}`
    }

    const selectField = dimensions.map(p => quoteIdentifier(dbType, p))
    const sql = `select ${_.concat(selectField, metricsFields).filter(_.identity).join(',')} 
      from ${[quoteIdentifier(dbType, dataSourceInfo.schema), quoteIdentifier(dbType, tableInfo.name)].filter(_.identity).join('.')}
      ${where ? 'where ' : ''} ${where}
      ${metricsFields.length ? `group by ${selectField}` : ''}
      ${orderby.length ? `order by ${orderby.join(',')}` : ''}
      limit ${config.externalDataSourcesLimit}
    `

    let { hostAndPort, database, user, password } = dataSourceInfo.connection_params
    password = XorUtils.decrypt(password)
    let res = []
    if (dbType === OfflineCalcDataSourceTypeEnum.Oracle) {
      res = await rawSQLQueryForOracle(sql, binds, hostAndPort, database, user, password)
    } else if (dbType === OfflineCalcDataSourceTypeEnum.SQLServer) {
      res = await rawSQLQueryForSQLServer(sql, binds, hostAndPort, database, user, password)
    } else if (dbType === OfflineCalcDataSourceTypeEnum.Db2) {
      res = await rawSQLQueryForDb2Server(sql, binds, hostAndPort, database, user, password)
    } else if (dbType === OfflineCalcDataSourceTypeEnum.PostgreSQL) {
      res = await rawSQLQueryForPG(sql, binds, hostAndPort, database, user, password)
    } else if (dbType === OfflineCalcDataSourceTypeEnum.MySQL) {
      res = await rawSQLQueryForMysql(sql, binds, hostAndPort, database, user, password)
    }
    // 处理数据
    const total = _.reduce(
      metricNames,
      (r, v) => {
        r[v] = _.sumBy(res, p => p[v])
        return r
      },
      {}
    )
    let { limit = 10, sortCol = metrics[0], sortDirect = 'desc' } = _.get(dimensionExtraSettings, 0) || {}
    // 1维或者表格 不需要group
    if (dimensions.length === 1) {
      res = _.take(_.orderBy(res, [sortCol], [sortDirect]), limit)
      ctx.body = [{ ...total, resultSet: res }]
      return
    }
    // 多维度group返回
    res = _.groupBy(res, p => _.get(p, dimensions[0]))
    let keys = _.keys(res)
    keys = _.sortBy(keys, p => _.sumBy(res[p], v => v[sortCol]) * (sortDirect === 'desc' ? 1 : -1))
    keys = _.take(keys, limit)
    let { limit: lastLimit = 10, sortCol: lastSortCol = metrics[0], sortDirect: lastSortDirect = 'desc' } = _.get(dimensionExtraSettings, 1) || {}
    res = keys.map(p => {
      const total = _.reduce(
        metricNames,
        (r, v) => {
          r[v] = _.sumBy(res[p], d => d[v])
          return r
        },
        {}
      )
      let data = { [dimensions[0]]: p, ...total }
      const group2 = _.groupBy(res[p], p => _.get(p, dimensions[1]))
      let keys2 = _.keys(group2)
      keys2 = _.sortBy(keys2, p => _.sumBy(res[p], v => v[lastSortCol]) * (lastSortDirect === 'desc' ? 1 : -1))
      keys2 = _.take(keys2, lastLimit)
      keys2.map((d, i) => {
        _.forEach(metricNames, m =>
          _.set(
            data,
            `${dimensions[1]}_Group.${i}.${m}`,
            _.sumBy(group2[d], v => _.toNumber(v[m]))
          )
        )
        _.set(data, `${dimensions[1]}_Group.${i}.${dimensions[1]}`, d)
      })
      return data
    })
    ctx.body = [{ ...total, resultSet: res }]
    return
  },

  queryDruidData: async ctx => {
    let queryObj = ctx.q
    let { since, until } = queryObj
    if (!queryObj.filters) {
      queryObj.filters = []
    }
    if (since || until) {
      setCacheControlByTimeRange(ctx, since, until)
    } else {
      let timeRangeFlt = _.find(queryObj.filters, flt => flt.col === '__time' && flt.op === 'in')
      if (timeRangeFlt) {
        timeRangeFlt = decryptFlt(timeRangeFlt)
        let relativeTime = isRelative(timeRangeFlt.eq) ? timeRangeFlt.eq : 'custom'
        let [since, until] = relativeTime === 'custom' ? timeRangeFlt.eq || [] : convertDateType(relativeTime, 'iso')
        setCacheControlByTimeRange(ctx, since, until)
      }
    }
    if (config.site.enableExternalDataSourcesInstitutions) {
      const { druid_datasource_id } = queryObj
      const dimensions = await db.SugoDimensions.findAll({ raw: true, where: { parentId: druid_datasource_id } })
      const dim = (dimensions.find(p => _.get(p, 'params.isInstitution', false)) || {}).name
      const institutionsFilter = await generateInstitutionsFilter(ctx.session, dim, true)
      if (institutionsFilter) {
        queryObj.filters.push(institutionsFilter)
      }
    }
    queryObj = await addFiltersByRole(ctx, queryObj)

    ctx.body = await DruidQueryService.queryByExpression(queryObj, { ctx })
  },

  // 通过slices的params参数查询druid数据 提供api给后台算法用
  queryDruidDataForApi: async ctx => {
    let queryObj = ctx.request.body
    if (!queryObj.druid_datasource_id || !queryObj.params) {
      return returnError(ctx, '非法请求，缺少参数')
    }
    let oldQueryArgs = transformToOldQueryFormat(queryObj)
    oldQueryArgs = await addFiltersByRole(ctx, oldQueryArgs)

    const data = await DruidQueryService.queryByExpression(oldQueryArgs, { ctx })
    returnResult(ctx, data)
  },

  queryDruidDistinct: async ctx => {
    let { dataSourceName, columnName } = ctx.params
    let { query } = ctx.query

    let q = query && JSON.parse(decompressUrlQuery(query))

    setCacheControlByTimeRange(ctx, q && q.since, q && q.until, undefined, 600)

    let wherePart = ''
    if (q) {
      let {
        prevLayerValues,
        nameFilter,
        since, // 时间应该为自然日，否则 get 缓存不能命中 YYYY-MM-DD
        until
      } = q

      // until 包括当日整日
      until = until && until.length === 10 ? moment(until).add(1, 'days').format('YYYY-MM-DD') : until
      if (/:59$/.test(until)) {
        until = moment(until).toISOString().replace('.000', '.999')
      } else if (/:59\.000/.test(until)) {
        until = until.replace('.000', '.999')
      }
      prevLayerValues = prevLayerValues || []
      nameFilter = nameFilter || ''

      wherePart = prevLayerValues
        .map(({ col, val }) => ` ${col} = '${val}' `)
        .concat([nameFilter && ` \`${columnName}\` like '%${nameFilter}%' `, since && ` '${since}' <= __time `, until && ` __time <= '${until}' `])
        .filter(_.identity)
        .join(' and ')
    }
    let sql = `select \`${columnName}\`, count() as c0 from \`${dataSourceName}\` ${wherePart && `where ${wherePart}`} group by \`${columnName}\` order by c0 desc limit ${
      (q && q.limit) || 50
    }`

    // console.log(sql)

    try {
      let sqlParse = Expression.parseSQL(sql)
      if (sqlParse.verb && sqlParse.verb !== 'SELECT') {
        throw new Error('Unsupported SQL verb ' + sqlParse.verb + ' must be SELECT, DESCRIBE, SHOW, or a raw expression')
      }
      let computeContext = await getExpressionComputeContext(ctx, dataSourceName)
      let res = await plyqlExecutor.executeSQLParse(sqlParse, computeContext.context, computeContext.timezone)

      let data = res.toJS().map(r => r[columnName])
      ctx.body = data
    } catch (e) {
      console.error(e)
      ctx.body = []
    }
  },

  copyDashboards: async ctx => {
    let { oldDatasource, toDatasource, toProjectId, toDatasourceName } = ctx.q
    let { id: userId } = ctx.session.user
    let slices = await SlicesService.copy(oldDatasource, toDatasource, toProjectId, toDatasourceName, userId)
    // console.log('---------------data---------------')
    // console.log(slices)
    if (!slices) {
      ctx.body = {
        success: true,
        data: slices
      }
      return
    }
    ctx.body = {
      success: false,
      slices,
      msg: 'error'
    }
  }
}
