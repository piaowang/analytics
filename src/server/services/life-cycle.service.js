/**
 * @author WuQic<chao.memo@gmail.com>
 * @date  2019-03-18 14:30:26
 * @description 生命周期service层
 */

import { BaseService } from './base.service'
import { getLookupInfo, doRecompute } from './segment.service'
import RedisScheduleService from './redis-schedule.service'
import {mapAwaitAll, immutateUpdate} from '../../common/sugo-utils'
import Fetch from '../utils/fetch-kit'
import { LifeCycleState } from 'common/constants'
import segmentService from './segment.service'
import conf from '../config'
import db from '../models'
import _ from 'lodash'
import moment from 'moment'

const pioUserGroupUrl = conf.pioUserGroupUrl

export default class LifeCycleService extends BaseService {
  constructor() {
    super('LifeCycles')
    this.redisSchedule = new RedisScheduleService({prefix: 'sugo:life-cycle:scheduler'})
    this.prefix_key = 'life-cycle'
  }

  getJobKey(suffix) {
    return `${this.prefix_key}:${suffix}`
  }

  async getAllUg(ugIds, queryAll = false) {
    let nowUg = await db.Segment.findAll({
      where: {
        $or: {
          id: ugIds
        }
      },
      raw: true
    })

    nowUg = ugIds.map( i => {
      return _.find(nowUg, o => o.id === i)
    })

    if (!queryAll) return nowUg

    let preWeekOrDay = 'preWeek'

    let preUg = await this.getPreUg({ until: moment().add(-7, 'd'), ugIds })

    if (_.isEmpty(preUg)) {
      preWeekOrDay = 'preDay'
      preUg = await this.getPreUg({ until: moment().add(-1, 'd'), ugIds})

    }

    return {
      nowUg,
      preUg,
      preWeekOrDay
    }
  }

  async getPreUgByIds({ ids }) {
    let preUg = await db.SegmentVersion.findAll({
      where: {
        $and: {
          $or: {
            id: ids
          }
        }
      }, raw: true
    })
    return preUg
  }

  async getPreUg({until, ugIds}) {
    let preUg = await db.SegmentVersion.findAll({
      where: {
        $and: {
          $or: {
            segment_id: ugIds
          },
          compute_time: {
            $between: [until.startOf('d').toISOString(), until.endOf('d').toISOString()]
          }
        }
      }, raw: true
    })

    preUg = ugIds.map( i => _.find(preUg, o => o.segment_id === i)).filter(_.identity)
    return preUg
  }

  async setScheduleJob(id,transaction) {
    let lifeCycle = await this.findByPk(id, { ...transaction, raw: true })
    let { updateHour } = lifeCycle.trigger_timer
    const key = this.getJobKey(id)
    //不需要年,小于当前时间上面有判断,到这里的时间一定是大于当前时间的
    await this.redisSchedule.addJob(key, {
      // cron: `${s} ${m} ${H} ${D} ${M} *`,
      cron: `0 ${updateHour} * * *`,
      path: './life-cycle.service',
      func: 'taskRunning',
      data: id,
      counter: 0
    })
  }

  async removeScheduleJob(id) {
    await this.redisSchedule.cancelJob(this.getJobKey(id))
  }

  async taskRunning(definition) {
    const id = definition.data
    console.log(`start running ${this.prefix_key}`, id)
    let lifeCycle = await this.findByPk(id)
    let { stages } = lifeCycle

    let dbUgs = []
    for (let i = 0; i < stages.length; i ++) {
      let stage = stages[i]
      let ug = await db.Segment.findOne({
        where: { id: stage.id } 
      },{ raw: true })
      dbUgs.push(ug)
      await doRecompute(stage.id)
    }

    await this.checkMutual(id, dbUgs )
  }

  async checkMutual(id, dbUgs) {
    let serviceUrl = `${pioUserGroupUrl}/ant/usergroup/checkMutex`

    let that = this
    // dbUgsWithQuery  TODO
    let dbUgsWithQuery = await mapAwaitAll(dbUgs, dbUg => {
      return {
        type: 'usergroup',
        query: getLookupInfo(dbUg)
      }
    })
    let checkRes = await Fetch.post(serviceUrl, dbUgsWithQuery, {
      handleResponse: async res => res.text() }).then( async r => {
      r = JSON.parse(r)
      if (r[0].status === 'success') {
        if (_.isEmpty(r[0].result)) {
          return await that.update({ status: { state: LifeCycleState.pass, error: '' }}, {id})
        }

        let mutualResult = r[0].result
        let fonts = Object.keys(mutualResult)
        let mutual = ''
        fonts.map( i => {
          let ends = mutualResult[i]
          i = i.replace('usergroup_', '')
          let temp = ''
          dbUgs.map( dbUg => {
            if (dbUg.id === i) {
              temp += dbUg.title + '和'
            }
            for (let j = 0; j < ends.length; j ++) {
              let end = ends[j]
              end = end.replace('usergroup_', '')
              if (dbUg.id === end) {
                temp += dbUg.title + ','
              }
            }
          })
          temp = temp.substr(0, temp.length - 1)
          temp += '的人群条件重复;'
          mutual += temp + '\n'
        })
        return that.update({ status: { state: LifeCycleState.nopass, error: mutual.substr(0, mutual.length - 1) }}, {id})
      }
      await that.update({ status: { state: LifeCycleState.nopass, error: '互斥检测失败,请重新保存生命周期' }}, {id})
    })
  }

  async clearVersionSchedule() {
    let versionList = await db.SegmentVersion.findAll({
      where: {
        created_at: {
          $lt: moment().add(-30,'d').startOf('day').toISOString()
        }
      }, raw: true
    })

    await mapAwaitAll(versionList, async ver => {
      await segmentService.del( { 
        query: { where: { id: ver.id }, raw: true},
        del: { 
          ...ver.params.dataConfig,
          groupId: `usergroup_${ver.id}`
        } })
    })
  }

  async initLifeCycleTasks() {
    const clusterId = process.env.NODE_APP_INSTANCE
    // 仅仅在第一个实例运行，这样就不会出现请求不匹配
    if (clusterId > 0) return
    // 清理历史缓存中的配置
    await this.redisSchedule.clearJobs() // 清除当前模块所有相关定时任务key
    const res = await this.findAll({ }, { raw: true })
    process.nextTick(async () => {
      await Promise.all(res.map(data => {
        this.setScheduleJob(data.id)
      }))
      const key = this.getJobKey('clear-segmentversion-job')
      this.removeScheduleJob('clear-segmentversion-job')
      this.redisSchedule.addJob(key, {
        // cron: `${s} ${m} ${H} ${D} ${M} *`,
        cron: '0 1 * * *',
        path: './life-cycle.service',
        func: 'clearVersionSchedule',
        data: '',
        counter: 0
      })
    })
  }

}
