import SugoOfflineCalcVersionHistoriesService from '../services/sugo-offline-calc-version-histories.service'
import SugoOfflineCalcIndicesService, {genIndicesId} from '../services/sugo-offline-calc-indices.service'
import SugoOfflineCalcModelsService from '../services/sugo-offline-calc-models.service'
import SugoOfflineCalcReviewerService from '../services/sugo-offline-calc-reviewer.service'
import SugoOfflineCalcTablesService from '../services/sugo-offline-calc-tables.service.js'
import SugoOfflineCalcDataSourcesService from '../services/sugo-offline-calc-data-sources.service'
import db from '../models'
import { OfflineCalcTargetType, OfflineCalcVersionStatus } from '../../common/constants'
import { Response } from '../utils/Response'
import shortid from 'shortid'
import _ from 'lodash'
import moment from 'moment'

export default class SugoOfflineCalcVersionHistoriesController { 

  constructor() {
    this.sugoVersionHistoriesService = new SugoOfflineCalcVersionHistoriesService()
    this.servList = {
      [OfflineCalcTargetType.Indices]: this.sugoOfflineCalcIndicesService = SugoOfflineCalcIndicesService.getInstance(),
      [OfflineCalcTargetType.IndicesModel]: this.sugoOfflineCalcModelsService =  SugoOfflineCalcModelsService.getInstance(),
      [OfflineCalcTargetType.Table]: this.sugoOfflineCalcTablesService =  SugoOfflineCalcTablesService.getInstance(),
      [OfflineCalcTargetType.Datasource]: this.sugoOfflineCalcDataSourcesService = SugoOfflineCalcDataSourcesService.getInstance(),
      [OfflineCalcTargetType.Reviewer]: this.sugoOfflineCalcReviewerService = new SugoOfflineCalcReviewerService()
    }
  }

  async query(ctx) {
  }

  async getHistoryById(ctx) {
    const { id, targetType } = _.isEmpty(ctx.q) ? ctx.query : ctx.q
    let target

    target = await this.servList[targetType + ''].findByPk(id)
    // if (!_.isEmpty(target)) {
    //   target.belongs_id
    // }
  }
  
  async queryReview(ctx) {
    let { status, offset, limit } = _.isEmpty(ctx.q) ? ctx.query : ctx.q
    const { user } = ctx.session
    const {id: user_id} = user

    let where = {
      created_by: user_id,
      status
    }

    if (status === 'all') where = _.omit(where, 'status')
    if (status === OfflineCalcVersionStatus.watingForReview) where.status = {
      $or: [OfflineCalcVersionStatus.watingForReview, OfflineCalcVersionStatus.watingForDel]
    }
    //判断该用户是否为审核员 不是则只查自己的
    let reviewer = await this.servList[OfflineCalcTargetType.Reviewer]
      .findAll({}, {
        attributes: ['reviewer_ids'],
        raw: true
      })

    reviewer.map( i => {
      if (i.reviewer_ids.includes(user_id)) {
        where = _.omit(where, 'created_by')
      }
    })

    let res = await this.sugoVersionHistoriesService.findAll(where,{
      order: [['status', 'ASC']],
      raw: true,
      offset: _.isNil(offset) ? undefined : +offset,
      limit: _.isNil(limit) ? undefined : +limit
    })
    
    for (let i = 0; i < res.length; i ++) {
      let { target_id, target_type } = res[i]
      let target = await this.servList[target_type + ''].findByPk(target_id)
      res[i].target = target
    }
    return ctx.body = Response.ok(res)
  }

  async create(ctx) {
    const { id, targetType, version ,comment } = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
    const { user } = ctx.session
    const {company_id, id: user_id} = user

    let { res, msg } = await db.client.transaction(async transaction => {
      try {
        let currentItem = await this.servList[targetType + ''].findByPk(id)
        let belongs_id = currentItem.belongs_id
        let theLastVersion
  
        // 判断是否存在公有版本，跟此项同名（跳过与自身 belongs_id 相同的公有版本）
        if (!currentItem.belongs_id) {
          let existedSameNameTerm = await this.servList[targetType].findOne(
            {
              name: currentItem.name,
              belongs_id: {$eq: db.Sequelize.col('id')}
            },
            {raw: true, transaction})
          if (existedSameNameTerm) {
            throw new Error('存在同名的公有项，请基于同名公有版本进行修改')
          }
        }
        // 检查依赖项是否公有
        if (this.servList[targetType].checkDepsIsPublic) {
          let hasNoPrivateIdxDep = await this.servList[targetType].checkDepsIsPublic(currentItem, transaction)
          if (!hasNoPrivateIdxDep) {
            throw new Error('存在私有版本依赖,请先修改再提审')
          }
        }
  
        //有belongs_id 就是有历史版本 只要比历史版本号大 允许任何人提审任意次
        //当通过其中一个后 取消所有待审项
        if (belongs_id) {
          theLastVersion = await this.sugoVersionHistoriesService.findOne({
            target_id: belongs_id,
            target_type: targetType,
            status: {
              $or: [OfflineCalcVersionStatus.watingForReview, OfflineCalcVersionStatus.pass, OfflineCalcVersionStatus.watingForDel]
            }
          }, { transaction, raw: true })
        }

        if (!theLastVersion) {
          theLastVersion = await this.sugoVersionHistoriesService.findOne({
            $and: {
              target_id: currentItem.id,
              target_type: targetType,
              status: OfflineCalcVersionStatus.watingForReview
            }
          }, { transaction, raw: true })
        }

        if (Number(_.get(theLastVersion, 'version')) >= Number(version)) {
          return { res: false, msg: '版本号已存在或小于已有版本号'}
        }

        let reviewerList = await this.servList[OfflineCalcTargetType.Reviewer].findAll({},{raw: true, transaction})
        let reviewer = {
          [OfflineCalcTargetType.Indices]: _.find(reviewerList, o => o.target_type + '' === OfflineCalcTargetType.Indices) || {},
          [OfflineCalcTargetType.IndicesModel]: _.find(reviewerList, o => o.target_type + '' === OfflineCalcTargetType.IndicesModel) || {}
        }
    
        if (_.isEmpty(_.get(reviewer[targetType + ''], 'reviewer_ids', []))) {
          return { res: false, msg: '没有审核人员,请先设置'}
        }

        let params = {
          //target_id 不能直接用公用的id 该字段要找是谁的提审 通过时 修改修改成公用 用于判断版本号迭代
          // target_id: belongs_id || id,
          target_id: id,
          target_type: targetType,
          version,
          status: OfflineCalcVersionStatus.watingForReview,
          clone: currentItem,
          review_status: {
            status: [],
            reviewer_list: {
              list: _.get(reviewer[targetType + ''], 'reviewer_ids', []),
              strategy: _.get(reviewer[targetType + ''], 'strategy', [])
            }
          },
          comments: {
            releaser: [{
              user_id,
              comment,
              comment_date: moment().format('YYYY-MM-DD HH:mm:ss')
            }],
            reviewer: []
          },
          created_by: user_id,
          company_id
        }
        await this.sugoVersionHistoriesService.create(params, { transaction })
        return { res: true }
      } catch(e) {
        console.log(e)
        const msg = _.isString(e) ? e : e.message
        return { res: false, msg: `无法提交审核：${msg}` }
      }
    })
    if (_.isObject(msg)) msg = '失败'
    if (!res) return ctx.body = Response.fail(msg)
    return ctx.body = Response.ok()
  }

  async preview(ctx) {
    let { id } = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
    let res = await this.sugoVersionHistoriesService.findByPk(id)
    let target_id = res.target_id
    let target_type = res.target_type
    let target = await this.servList[target_type + ''].findByPk(target_id)

    let belongs_id = target.belongs_id
    let history = {}

    if (!_.isEmpty(belongs_id)) {
      history = await this.queryHistory(belongs_id, target_type)
    }

    return ctx.body = Response.ok({
      target: [target],
      target_type,
      history: [history]
    })
  }

  async confirmReview(ctx) {
    //reviewResult 审核结果
    const { id, comment, reviewResult } = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
    const { user } = ctx.session
    const {id: user_id, company_id } = user

    let res = await db.client.transaction(async transaction => {
      try {
        const versionItem = await this.sugoVersionHistoriesService.findByPk(id, { raw: true, transaction })

        let reviewer = versionItem.review_status.reviewer_list.list
  
        let review_status = _.cloneDeep(versionItem.review_status)
        let comments = _.cloneDeep(versionItem.comments)
        let status = _.cloneDeep(versionItem.status)
        let target_id = _.cloneDeep(versionItem.target_id)
        let target_type = _.cloneDeep(versionItem.target_type)
  
        //当前只有按顺序审核的逻辑 未来需要修改 只要review_status有元素即通过
        review_status.status.push({ user_id, status: reviewResult })
        comments.reviewer.push({user_id, comment, reviewResult,  comment_date: moment().format('YYYY-MM-DD HH:mm:ss')})

        switch (reviewResult) {
          case OfflineCalcVersionStatus.pass: 
            //当前审核人数量和预设审核人数量相同 则状态变为通过审核
            if (review_status.status.length === reviewer.length) status = OfflineCalcVersionStatus.pass
            //1.往版本记录的审核状态添加该审核人
            await this.sugoVersionHistoriesService.update(
              {
                status,
                review_status,
                comments
              },{ id },{ transaction }
            )

            //当前审核人数量和预设审核人数量相同 通过审核的逻辑
            if (status === OfflineCalcVersionStatus.pass) {
              const targetType = target_type + ''

              //如果有diff 就是该私有版本是基于公有新建的私有 需要覆盖公有 版本记录记录下旧的公有 和 旧的版本id
              let { target, diff, base_version_id = '' } = await this.checkHasDiff(target_id, targetType, transaction)
  
              if (base_version_id) {
                //拒绝掉所有引用该共有的提交
                await this.cancelAllWatingForReview(diff, targetType, user_id, transaction)

                await this.sugoVersionHistoriesService.update(
                  {
                    // clone: target, 直接在创建审核的时候记录
                    base_version_id,
                    target_id: diff.id
                  },{ id },{ transaction }
                )

                //覆盖公有
                await this.servList[targetType].update({
                  ..._.omit(target, ['id', 'belongs_id', 'created_by', 'updated_by', 'company_id', 'created_at', 'updated_at']),
                  updated_by: user_id
                }, { id: diff.id }, { transaction })
              } else {
                //第一次提审通过 自己变成公有 且生成一个依赖该公有的私有
                await this.servList[targetType].update({ belongs_id: target_id, updated_by: user_id }, { id: target_id }, { transaction })

                // 确保指标 ID 不重复
                let newId, idxIdOffset = 0
                while(!newId) {
                  newId = targetType === OfflineCalcTargetType.Indices ? genIndicesId(idxIdOffset++) : shortid()
                  let existed = await this.servList[targetType].findByPk(newId, {raw: true, transaction})
                  if (existed) {
                    newId = null
                  }
                }
                await this.servList[targetType].create(
                  { id: newId,..._.omit(target, ['id', 'belongs_id']), belongs_id: target_id }, 
                  { transaction }
                )
              }
            }
            break
          case OfflineCalcVersionStatus.noPass: 
            await this.sugoVersionHistoriesService.update(
              {
                status: OfflineCalcVersionStatus.noPass,
                review_status,
                comments
              }, { id }, { transaction }
            )
            break
        }

        return true
      } catch(e) {
        console.log(e)
        const error = new Error(`审批失败：${e.message}`)
        error.originalErr = e
        throw error
      }
    })

    if (!res) return ctx.body = Response.fail()
    return ctx.body = Response.ok()
  }

  async cancelReview(ctx) {
    const { id } = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
    await this.sugoVersionHistoriesService.update({ status: OfflineCalcVersionStatus.cancel }, { id })
    return ctx.body = Response.ok()
  } 

  async cancelAllWatingForReview(belongs, target_type, user_id, transaction) {
    let allWatingForReview = await this.sugoVersionHistoriesService.findAll({
      target_type,
      status: OfflineCalcVersionStatus.watingForReview
    }, { raw: true, attributes: ['target_id', 'comments', 'review_status'], transaction })

    if (_.isEmpty(allWatingForReview)) return

    let allWatingForReviewIds = allWatingForReview.map(i => i.target_id)
    let res = await this.servList[target_type + ''].findAll({
      id: { $or: allWatingForReviewIds }
    }, { raw: true, attributes: ['id', 'belongs_id'], transaction})

    res = res.filter( i => i.belongs_id === belongs.id).map( i => i.id)

    for (let i = 0; i < res.length; i ++) {
      let item = _.find(allWatingForReview, o => o.target_id === res[i])
      let comments = _.get(item, 'comments')
      let review_status = _.get(item, 'review_status')
      comments.reviewer.push({ comment: '已通过了先提交的 取消该提交', user_id, comment_date: moment().format('YYYY-MM-DD HH:mm:ss')})
      review_status.status.push({ status: OfflineCalcVersionStatus.noPass, user_id })

      await this.sugoVersionHistoriesService.update({
        status: OfflineCalcVersionStatus.noPass,
        review_status,
        comments
      }, { target_id: res[i] }, { transaction })
    }

  }

  checkHasDiff = async (id, type, transaction) => {
    let target, diff, base_version_id

    target = await this.servList[type + ''].findByPk( id, { transaction, raw: true })
    if (target.belongs_id) {
      diff = await this.servList[type + ''].findByPk(target.belongs_id, { transaction, raw: true})
      let idRes = await this.sugoVersionHistoriesService.findOne({ target_id: target.belongs_id, status: {
        $and: [{ $ne: OfflineCalcVersionStatus.noPass }, { $ne: OfflineCalcVersionStatus.cancel }]
      }},{ transaction, raw: true, attributes: ['id'] })
      base_version_id = idRes.id
    }

    return { target, diff, base_version_id }
  }

  queryHistory = async (belongs_id, target_type) => {
    return await this.servList[target_type + ''].findByPk(belongs_id)
  }

  async reviewDel(ctx) {
    //提交删除审核
    let delId = ctx.params.id
    const { type } = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
    let targetType = type
    let id = delId

    let reviewerList = await this.servList[OfflineCalcTargetType.Reviewer].findAll({},{raw: true})
    let reviewer = {
      [OfflineCalcTargetType.Indices]: _.find(reviewerList, o => o.target_type + '' === OfflineCalcTargetType.Indices) || {},
      [OfflineCalcTargetType.IndicesModel]: _.find(reviewerList, o => o.target_type + '' === OfflineCalcTargetType.IndicesModel) || {}
    }

    if (_.isEmpty(_.get(reviewer[targetType], 'reviewer_ids', []))) {
      return ctx.body = Response.fail('没有审核人员,请先设置')
    }

    let isInfluence = await this.sugoVersionHistoriesService.getInfluence(id, targetType)

    if (!_.isEmpty(isInfluence)) {
      let tip = ''
      isInfluence.map( i => tip = i.title + ',' || i.name + ',')
      return ctx.body = Response.fail( `该维度被${tip.substr(0, tip.length - 1)}引用`)
    }

    let theLast = await this.sugoVersionHistoriesService.findAll({
      target_id: id,
      status: OfflineCalcVersionStatus.pass
    }, { raw: true })

    theLast = _.maxBy(theLast, o => Number(o.version))

    await this.sugoVersionHistoriesService.create({
      ..._.omit(theLast,'id'),
      status: OfflineCalcVersionStatus.watingForDel,
      review_status: {
        ...theLast.review_status,
        del_reviewer_list: {
          list: _.get(reviewer[targetType], 'reviewer_ids', []),
          strategy: _.get(reviewer[targetType], 'strategy', [])
        },
        del_status: []
      }
    })

    return ctx.body = Response.ok()
  }

  async handleDelReview(ctx) {
    let { id, reviewResult } = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
    const { user } = ctx.session
    const {id: user_id} = user

    if (id.includes('/')) {
      let target_version = await this.sugoVersionHistoriesService.findOne({
        target_id: id.split('/')[0],
        target_type: OfflineCalcTargetType.IndicesModel,
        status: OfflineCalcVersionStatus.watingForDel,
        version: id.split('/')[1]
      }, { raw: true })
      id = target_version.id
    }

    if (reviewResult === OfflineCalcVersionStatus.noPass) {
      await this.sugoVersionHistoriesService.remove({ id })
      return ctx.body = Response.ok()
    }

    let versionItem = await this.sugoVersionHistoriesService.findByPk(id)

    let reviewer = versionItem.review_status.del_reviewer_list.list

    let review_status = _.cloneDeep(versionItem.review_status)
    let status = _.cloneDeep(versionItem.status)
    let target_id = _.cloneDeep(versionItem.target_id)
    let target_type = _.cloneDeep(versionItem.target_type)

    review_status.del_status.push({ user_id, status: reviewResult })

    if (review_status.del_status.length === reviewer.length) status = OfflineCalcVersionStatus.deleted
    await this.sugoVersionHistoriesService.update({
      status,
      review_status
    }, { id })

    //当前审核人数量和预设审核人数量相同 确认删除逻辑
    if (status === OfflineCalcVersionStatus.deleted) {
      //都确认删除了 把项的记录删了 引用去掉 状态修改成已删除
      let shouldReset = await this.servList[target_type].findAll({
        belongs_id: target_id
      }, { raw: true })

      for (let i = 0; i < shouldReset.length; i ++) {
        let item = shouldReset[i]
        await this.servList[target_type].update({
          ..._.omit(item,['id']),
          belongs_id: null
        },{ id: item.id })
      }

      await this.servList[target_type].remove({
        id: target_id
      })
    }

    return ctx.body = Response.ok()
  }

  async getVersionTree(ctx) {
    let { res, msg } = await db.client.transaction(async transaction => {
      try {

        let others = {
          raw: true,
          order: [['updated_at', 'desc']]
        }

        let IndicesList = await this.servList[OfflineCalcTargetType.Indices].findAll({
          belongs_id: {$eq: db.Sequelize.col('id')}
        }, others )

        let IndicesModelList = await this.servList[OfflineCalcTargetType.IndicesModel].findAll({
          belongs_id: {$eq: db.Sequelize.col('id')}
        }, others)

        return { 
          res: {
            IndicesList, IndicesModelList
          } 
        }
      } catch (e) {
        console.log(e)
      }
    })

    return ctx.body = Response.ok(res)
  }

  async getVersionList(ctx) {
    let { id } = _.isEmpty(ctx.q) ? ctx.query : ctx.q
    let res = await this.sugoVersionHistoriesService.findAll({
      target_id: id,
      status: OfflineCalcVersionStatus.pass 
    }, { raw: true })

    res = res.sort( (a, b) => {
      if (Number(b.version) > Number(a.version)) {
        return 1
      }
      return -1
    })

    return ctx.body = Response.ok(res)
  }

  async getRelationShip(ctx) {
    const { id, targetType } = _.isEmpty(ctx.q) ? ctx.query : ctx.q
    const target = await this.servList[targetType].findByPk(id)
    const formulaTree = _.get(target, 'formula_info.ast')

    return ctx.body = Response.ok({ formulaTree, rootPoint: target })
  }

  async getInfluenceShip(ctx) {
    const { id, targetType } = _.isEmpty(ctx.q) ? ctx.query : ctx.q

    let res = await this.sugoVersionHistoriesService.getInfluence(id, targetType)

    let rootPoint = await this.servList[targetType].findByPk(id)

    return ctx.body = Response.ok({
      influenceTree: res,
      rootPoint
    })
  }

  async getInfluenceList(ctx) {
    const { id, targetType } = _.isEmpty(ctx.q) ? ctx.query : ctx.q
    let res = await this.sugoVersionHistoriesService.getInfluence(id, targetType)

    return ctx.body = Response.ok(res)
  }

  async checkCanReview(ctx) {
    const { id, targetType } = _.isEmpty(ctx.q) ? ctx.query : ctx.q

    let target = await this.servList[targetType].findByPk(id)
    let dimDeps = _.get(target, 'formula_info.dimDeps', [])
    dimDeps = dimDeps.filter(i => !i.includes('|'))
    let idxDeps = _.get(target, 'formula_info.idxDeps', [])

    let indicesRes = await this.servList[OfflineCalcTargetType.Indices].findAll({
      $and: [
        {id: { $in: idxDeps }},
        {belongs_id: {$eq: db.Sequelize.col('id')}}
      ]
    }, {
      raw: true
    })

    dimDeps = dimDeps.filter(_.identity)
    idxDeps = idxDeps.filter(_.identity)
    indicesRes = indicesRes.filter(_.identity)
    if (idxDeps.length !== indicesRes.length) {
      return ctx.body = Response.fail('存在私有版本依赖,请先修改再提审')
    }

    return ctx.body = Response.ok([target])
  }
}


