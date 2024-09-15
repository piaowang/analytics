import { BaseService } from '../services/base.service'
import RedisScheduleService from '../services/redis-schedule.service'
import SugoLogService from '../services/sugo-log.service'
import db from '../models'
import _ from 'lodash'
import sequelize from 'sequelize'
import moment from 'moment'

export default class ApiResultLogService extends BaseService {
  constructor() {
    super('ApiResultLog')
    this.redisSchedule = new RedisScheduleService({prefix: 'sugo:api-result-log:scheduler'})
    this.prefix_key = 'api-result-log'
  }

  getJobKey(suffix) {
    return `${this.prefix_key}:${suffix}`
  }

  async setSchedule() {
    const key = this.getJobKey('api-del-log')
    //不需要年,小于当前时间上面有判断,到这里的时间一定是大于当前时间的
    await this.redisSchedule.addJob(key, {
      // cron: `0 ${m} ${H} ${D} ${M} *`,
      cron: '0 1 1 * * *',
      path: './api-result-log.service',
      func: 'taskRunning',
      data: null,
      counter: 0
    })
  }

  async taskRunning(definition) {
    console.log(`start running ${this.prefix_key}`, new Date())
    let cond0 = {
      $and: {
        path: {
          $like: '%/data-api%'
        },
        created_at: { $lt: moment().startOf('D').toISOString()}
      }
    }
    await db.client.transaction(async transaction => {
      //汇总用 删除的用这个条件删
      let data = await SugoLogService.getInstance().dbInstance.findAll({
        raw: true,
        attributes: ['path', 'method', 'status', [sequelize.literal('extract(year from created_at)'), 'year'],[sequelize.literal('extract(month from created_at)'), 'month'],[sequelize.literal('extract(day from created_at)'), 'day'],[sequelize.literal('extract(hour from created_at)'), 'hour'],[sequelize.literal('count(id)'), 'count']],
        group: ['year', 'month', 'day', 'hour', 'path', 'method', 'status'],
        where: cond0,
        transaction
      })
      function fillDigit(num) {
        if ((num + '').length < 2) return '0' + num
        return num + ''
      }
      data = data.map( i => {
        let temp = _.omit(i, ['year', 'month', 'day', 'hour'])
        temp.created_at = moment(`${fillDigit(i.year)}-${fillDigit(i.month)}-${fillDigit(i.day)} ${fillDigit(i.hour)}:00:00`).format('YYYY-MM-DD HH:mm:ss')
        return temp
      })
      let existed = await db.ApiResultLog.findAll({
        where: {
          $or: data
        },
        raw: true,
        transaction
      })
      if (!_.isEmpty(existed)) {
        let existedDict = {}
        existed = existed.map( i => {
          existedDict[`${i.path}-${i.method}-${i.status}-${moment(i.created_at).format('YYYY-MM-DD HH:mm:ss')}`] = true
        })
        data = data.filter(i => {
          if (existedDict[`${i.path}-${i.method}-${i.status}-${i.created_at}`]) return false
          return true
        }) 
      }
      await db.ApiResultLog.bulkCreate(data,{ transaction  })
      let cond1 = {
        $and: {
          path: {
            $like: '%/data-api%'
          },
          created_at: { $lt: moment().add(-1,'M').startOf('D').toISOString()}
        }
      }
      await await SugoLogService.getInstance().dbInstance.destroy({
        where: cond1,
        transaction
      })
    })

  }


  async initApiResultLogTasks() {
    const clusterId = process.env.NODE_APP_INSTANCE
    // 仅仅在第一个实例运行，这样就不会出现请求不匹配
    if (clusterId > 0) return
    // 清理历史缓存中的配置
    await this.redisSchedule.clearJobs() // 清除当前模块所有相关定时任务key
    process.nextTick(async () => {
      await Promise.all([
        this.setSchedule()
      ])
    })
  }
}
