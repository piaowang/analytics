import LifeCycleService from '../services/life-cycle.service'
import { Response } from '../utils/Response'
import {checkLimit} from '../utils/resouce-limit'
import {UserGroupFilterTypeEnum, LifeCycleState} from 'common/constants'
import {immutateUpdate} from 'common/sugo-utils'
import segmentService from '../services/segment.service'
import ModelsService from '../services/marketing/models.service'
import LifeCycleModelService from '../services/lifecyclemodel.service.js'
import db from '../models'
import {mapAwaitAll} from '../../common/sugo-utils'
import _ from 'lodash'
import moment from 'moment'

export default class LifeCycleController {

  constructor() {
    this.lifeCycleService = new LifeCycleService()
    this.modelsService =  new ModelsService()
    this.lifeCycleModel = new LifeCycleModelService()
    this.db = this.lifeCycleService.db
  }

  async queryByProjectId(ctx) {
    const { project_id } = ctx.params
    if (!project_id) {
      return ctx.body = Response.ok(null)
    }
    const lifeCycle = await this.lifeCycleService.findOne({
      project_id
    })
    ctx.body = Response.ok(lifeCycle)
  }

  async save(ctx) {

    //数量限制
    //可能只剩下1个资源 但也让他创建5个
    await checkLimit(ctx, 'usergroup')

    const lifeCycle = ctx.q
    const { stages, project_id, relatedbehaviorprojectid, relatedusertagprojectid, trigger_timer, group_by_name } = lifeCycle
    let {user} = ctx.session
    let {company_id, id: user_id} = user
    let nextStages = _.cloneDeep(stages)

    let dbUgs = []

    let res = await db.client.transaction( async t => {
      const transaction = { transaction: t }
      for (let i = 0; i < stages.length; i ++) {
        let usergroup = stages[i]

        usergroup = _.pick(usergroup, [
          'title',
          'druid_datasource_id',
          'datasource_name',
          'params',
          'description',
          'usergroupIds',
          'md5',   //此处没有用到
          'tags'
        ])

        let q = {
          usergroup,
          user_id,
          company_id,
          transaction
        }
        let res = await segmentService.add(q)
        let dbUg = res.result || {}
        if (dbUg && dbUg.get) {
          dbUg = dbUg.get({plain: true})
        }
        dbUgs.push(dbUg)

        let dbUg_id = dbUg.id
        nextStages = immutateUpdate(nextStages, `[${i}].id`, () => dbUg_id)
      }

      let lifeCycleRes = await this.lifeCycleService.create({
        group_by_name,
        project_id,
        relatedbehaviorprojectid,
        relatedusertagprojectid,
        trigger_timer,
        company_id,
        created_by: user_id,
        stages: nextStages.map( i => ({
          stage: i.title,
          description: i.description,
          id: i.id
        })),
        status: {
          state: LifeCycleState.nopass,
          error: '尚未完成互斥检测,请稍后刷新页面'
        }
      }, { raw: true, transaction: t })

      await this.lifeCycleService.removeScheduleJob(lifeCycleRes.id)
      await this.lifeCycleService.setScheduleJob(lifeCycleRes.id, transaction)

      return lifeCycleRes
    })



    ctx.body = Response.ok(ctx, res)

    await this.lifeCycleService.checkMutual(res.id, dbUgs)
  }

  async update(ctx) {
    const { id } = ctx.params
    const lifeCycle = ctx.q
    const { stages, project_id, relatedbehaviorprojectid, relatedusertagprojectid, trigger_timer, group_by_name } = lifeCycle
    let {user} = ctx.session
    let {company_id, id: user_id} = user

    let dbUgs = []

    const oldLifeCycle = await this.lifeCycleService.findOne({ id })

    const { stages: oldStages } = oldLifeCycle

    if (stages.length > oldStages.length) await checkLimit(ctx, 'usergroup')

    let oldUgIds = oldStages.map( i => i.id)

    let shouldDelUgs = oldUgIds.filter( i => !stages.some( j => i === j.id ))

    //和旧的相比少了某个阶段
    if (shouldDelUgs) {
      for (let i = 0; i < shouldDelUgs.length; i ++) {
        
        let versionList = await db.SegmentVersion.findAll({ where: { segment_id: shouldDelUgs[i] }, raw: true } )

        await mapAwaitAll(versionList, async ver => {
          await segmentService.del( { 
            query: { where: { id: ver.id }, raw: true },
            del: { groupId: `usergroup_${ver.id}` }})
        })

        await segmentService.del({ query: { where: { id: shouldDelUgs[i] }, raw: true  } } )
      }
    }
    
    for (let i = 0; i < stages.length; i ++) {
      let usergroup = stages[i]

      let usergroup_id = usergroup.id

      usergroup = _.pick(usergroup, [
        'title',
        'druid_datasource_id',
        'datasource_name',
        'params',
        'description',
        'usergroupIds',
        'md5',   //此处没有用到
        'tags'
      ])

      let update = {
        updated_by: user_id,
        ...usergroup
      }

      if (usergroup_id) {
        let res = await segmentService.update({
          update,
          query: { where: { id: usergroup_id }  }
        })
        let dbUg = res.ug
        dbUgs.push(dbUg)
      } else {
        let transaction = await db.client.transaction()
        let q = {
          usergroup,
          user_id,
          company_id,
          transaction
        }
        let res = await segmentService.add(q)
        let dbUg = res.result || {}
        if (dbUg && dbUg.get) {
          dbUg = dbUg.get({plain: true})
        }
        dbUgs.push(dbUg)
        let dbUg_id = dbUg.id
        stages[i].id = dbUg_id
      }
    }
    let lifeCycleRes = await this.lifeCycleService.update({
      group_by_name,
      project_id,
      relatedbehaviorprojectid,
      relatedusertagprojectid,
      trigger_timer,
      company_id,
      updated_by: user_id,
      stages: stages.map( i => ({
        stage: i.title || i.stage,
        ..._.pick(i, ['id','description', 'scene_id'])
      })),
      status: {
        state: LifeCycleState.nopass,
        error: '尚未完成互斥检测,请稍后刷新页面'
      }
    }, { id }, { raw: true })


    await this.lifeCycleService.checkMutual(id, dbUgs)
    await this.lifeCycleService.removeScheduleJob(id)
    await this.lifeCycleService.setScheduleJob(id)

    return ctx.body = Response.ok()

  }

  async getAllUg(ctx) {
    const { ugIds, queryAll } = ctx.q
    let res = await this.lifeCycleService.getAllUg(ugIds, queryAll)
    return ctx.body = Response.ok(res)
  }

  async getPreUg(ctx) {
    const { until, ugIds } = ctx.q
    let res = await this.lifeCycleService.getPreUg({until: moment(until), ugIds})
    return ctx.body = Response.ok(res)
  }

  async getPreUgByIds(ctx) {
    const { ids } = ctx.q
    let res = await this.lifeCycleService.getPreUgByIds({ ids })
    return ctx.body = Response.ok(res)
  }

  async createModel(ctx) {
    const { name, lc_id } = ctx.q

    const res = await this.modelsService.findOrCreate({
      name
    }, { name }, { raw: true })

    let model_id = res[0].id || res[0].dataValues.id

    await this.lifeCycleModel.create({
      model_id, life_cycle_id: lc_id
    })

    return ctx.body = Response.ok(model_id)

  }

  async contractSegmentWithScene(ctx) {
    const { set } = ctx.q

    let res = await db.client.transaction( async transaction => {
      for ( let i = 0; i < set.length; i ++) {
        const { id, scene_id } = set[i]
        let existed = await db.SegmentWIthMarketingScene.findOne({
          where: {
            segment_id: id
          }
        },transaction)
        if (existed) {
          await db.SegmentWIthMarketingScene.update({
            scene_id
          },{
            where: {
              segment_id: id
            }
          },transaction)
        } else {
          await db.SegmentWIthMarketingScene.create({
            scene_id,
            segment_id: id
          },transaction)
        }
      }
    })

    return ctx.body = Response.ok()

  }
}
