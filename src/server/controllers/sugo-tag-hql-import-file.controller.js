
import { Response } from '../utils/Response'
import SugoHqlImportFileService from '../services/sugo-tag-hql-import-file.service'
import _ from 'lodash'
import UploadedFilesSvc from '../services/uploaded-files.service'
import { UserService } from '../services/user.service'
import GlobalConfigService from '../services/sugo-global-config.service'

const configKey = 'hqlImportFileClearConfig'

const getList = async (ctx) => {
  const { id } = ctx.params
  const { pageSize, pageIndex, searchKey } = ctx.q
  const { id: userId, company_id } = ctx.session.user
  let where = {
    company_id,
    project_id: id
  }
  if (searchKey) {
    where.file_name = { $like: `%${searchKey}%` }
  }
  let res = await SugoHqlImportFileService.getInstance().findAndCountAll(where, {
    raw: true,
    limit: pageSize,
    offset: (pageIndex - 1) * pageSize, 
    order: [['created_at', 'DESC']] 
  })

  if (!res.rows.length) {
    ctx.body = Response.ok(res)
    return
  }
  const userIds = res.rows.map(p => p.created_by)
  const users = await UserService.getInstance().findAll({
    id: {
      $in: userIds
    }
  }, { raw: true, attributes: ['id', 'username']})
  const userMap = _.reduce(users, (r, v) => {
    r[v.id] = v.username
    return r
  }, {})
  res.rows = _.map(res.rows, p => {
    return { ...p, created_user_name: userMap[p.created_by] }
  })
  ctx.body = Response.ok(res)
  return
}


const del = async (ctx) => {
  const { id } = ctx.params
  await UploadedFilesSvc.deleteById(id)
  await SugoHqlImportFileService.getInstance().update({
    state: 0
  }, {
    id
  })

  ctx.body = Response.ok('删除成功')
  return
}

const setConfig = async (ctx) => {
  const { clearConfig } = ctx.q
  const [info, isCreate] = await GlobalConfigService.getInstance().findOrCreate(
    { key: configKey },
    {
      key: configKey,
      value: clearConfig
    })
  if (!isCreate) {
    info.update({ value: clearConfig })
  }
  ctx.body = Response.ok('设置成功')
  return
}

const getConfig = async (ctx) => {
  const res = await GlobalConfigService.getInstance().findOne({ key: configKey })
  ctx.body = Response.ok(res)
  return
}

export default {
  getList,
  del,
  setConfig,
  getConfig
}
