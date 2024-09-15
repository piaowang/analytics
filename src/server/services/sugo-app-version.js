/**
 * Created by asd on 17-7-12.
 * @file AppVersionModel相关接口
 * @see {AppVersionModel}
 */

import { defineTypes, PropTypes } from '../../common/checker'
import { Response } from '../utils/Response'
import { APP_VERSION_STATUS } from '../../common/constants'
import conf from '../config'
import _ from 'lodash'
import db from '../models'

const {
  site: { sdkCommonH5 = false }
} = conf

const $checker = {
  create: defineTypes({
    appid: PropTypes.string.isRequired,
    app_version: PropTypes.string.isRequired,
    status: PropTypes.number
  }),
  update: defineTypes({
    id: PropTypes.string.isRequired,
    app_version: PropTypes.string,
    status: PropTypes.oneOf(_.values(APP_VERSION_STATUS)),
    event_bindings_version: PropTypes.string,
    last_deployed_on: PropTypes.number
  }),
  listWithEventsCount: defineTypes({
    appid: PropTypes.string.isRequired
  }),
  getEventCountByAppVersion: defineTypes({
    appid: PropTypes.string.isRequired,
    app_version: PropTypes.string
  }),
  checkAppVersion: defineTypes({
    app_version: PropTypes.string.isRequired
  })
}

export default {
  /**
   * 使用id查询记录详细
   * @param id
   * @return {Promise.<ResponseStruct<AppVersionModel>>}
   */
  async query(id) {
    const checked = PropTypes.string.isRequired({ id }, 'id')

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.AppVersion.findOne({ where: { id } })
    return Response.ok(ins.get({ plain: true }))
  },

  /**
   * 插入一条新记录
   * @param {{appid:String,app_version:String,status?:Number}} params
   * @return {Promise.<ResponseStruct>}
   */
  async create(params) {
    const checked = $checker.create(params)

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const { appid, app_version, status } = params
    const [record, success] = await db.AppVersion.findOrCreate({
      defaults: {
        appid,
        app_version,
        status,
        event_bindings_version: APP_VERSION_STATUS.Active
      },
      where: {
        appid,
        app_version
      }
    })

    return success ? Response.ok(record) : Response.fail('创建失败')
  },

  /**
   * 更新一条记录
   * @param {
   *  {
   *   id: String,
   *   app_version?: String,
   *   status?: Number,
   *   event_bindings_version?: Number,
   *   last_deployed_on?: Number
   *  }
   * } params
   * @return {Promise.<ResponseStruct>}
   */
  async update(params) {
    const checked = $checker.update(params)

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const { id, ...props } = params

    const [affectedCount] = await db.AppVersion.update(props, {
      where: {
        id
      }
    })

    return affectedCount > 0 ? Response.ok(params) : Response.fail('操作失败')
  },

  async listWithEventsCount(appid) {
    const checked = $checker.listWithEventsCount({ appid })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.AppVersion.findAll({
      where: {
        appid
      }
    })

    const SQL = `SELECT app.app_version, count(track.id) as count
        FROM sugo_track_event track
        INNER JOIN sugo_app_version app ON app.appid = track.appid
        AND app.app_version = track.app_version
        AND app.event_bindings_version = track.event_bindings_version
        WHERE app.appid = :appid
        GROUP BY app.app_version`

    let count = await db.client.query(SQL, {
      replacements: {
        appid
      }
    })

    const draftSql = `SELECT app.app_version, count(track.id) as count
    FROM sugo_track_event_draft track
    INNER JOIN sugo_app_version app ON app.appid = track.appid
    AND app.app_version = track.app_version
    WHERE app.appid = :appid
    GROUP BY app.app_version `

    let draftCount = await db.client.query(draftSql, {
      replacements: {
        appid
      }
    })
    // 如果有开启移动端共用h5开关的话，则直接获取数量，然后增加上去，根据projectid去查
    if (sdkCommonH5) {
      const dim_inst = await db.SugoDataAnalysis.findOne({ where: { id: appid }, raw: true })

      if (dim_inst.name.toLocaleUpperCase().indexOf('WEB') == -1) {
        // 查出h5的正式版本
        const h5Count = await db.TrackEventMobileH5.count({ where: { project_id: dim_inst.project_id }, raw: true }).catch(err => console.log(err))
        // 查出h5的測試版本
        const h5CountDraft = await db.TrackEventMobileH5Draft.count({ where: { project_id: dim_inst.project_id }, raw: true }).catch(err => console.log(err))
        count[0].forEach(o => {
          o.count = parseInt(o.count) + parseInt(h5Count)
        })
        draftCount[0].forEach(o => {
          o.count = parseInt(o.count) + parseInt(h5CountDraft)
        })
      }
    }
    return Response.ok({
      app_versions: ins.map(r => r.get({ plain: true })),
      count,
      draftCount
    })
  },

  async getEventCountByAppVersion(appid, app_version) {
    const checked = $checker.getEventCountByAppVersion({ appid, app_version })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const SQL = `SELECT count(track.id) as count
        FROM sugo_track_event track
        INNER JOIN sugo_app_version app ON app.appid = track.appid
        AND app.app_version = track.app_version
        AND app.event_bindings_version = track.event_bindings_version
        WHERE app.appid = :appid and app.app_version= :app_version`

    let count = await db.client.query(SQL, {
      replacements: {
        appid,
        app_version
      }
    })
    return Response.ok({
      eventCount: count[0][0].count
    })
  },

  async checkAppVersion(app_version) {
    const checked = $checker.checkAppVersion({ app_version })

    if (!checked.success) {
      return Response.fail(checked.message)
    }

    const ins = await db.AppVersion.findAll({
      where: {
        app_version
      }
    })
    return Response.ok({
      hasAppVersion: !!ins.length
    })
  },

  async getInfoByTokenAndVersion(token, appVersion) {
    const ins = await db.AppVersion.findOne({ where: { appid: token, app_version: appVersion }, raw: true })
    return Response.ok(ins)
  },

  async deleteAppVersion(token, appVersion) {
    const res = await db.AppVersion.destroy({ where: { appid: token, app_version: appVersion }, raw: true })
    return Response.ok(res)
  },
  /**
   * 获取当前token最大版本号信息
   * @param {*} token 
   */
  async getMaxVersionInfoByToken(token) {
    const res = await db.AppVersion.findAll({ where: { appid: token }, raw: true })
    return _.maxBy(res, p => p.app_version)
  }
}
