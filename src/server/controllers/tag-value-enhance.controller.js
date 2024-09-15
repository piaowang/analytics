import ValeuEnhanceService from '../services/tag-values-enhance.service'
import _ from 'lodash'
import shortid from 'shortid'
import SegmentServices from '../services/segment.service'
import {Response} from '../utils/Response'
import CryptoJS from 'crypto-js'


const TagEnhanceAttr = 'temp_usergroup_'

class TagValeuEnhanceController {

  constructor() {
    this.tagEnhanceSevice = ValeuEnhanceService.getInstance()
  }

  static getInstance() {
    if (!this._instance) {
      this._instance = new TagValeuEnhanceController()
    }
    return this._instance
  }

  saveValueEnhance = async (ctx) => {
    let { id, ...info } = ctx.q
    if (id) {
      const oldObj = await this.tagEnhanceSevice.findOne({ id })
      await this.tagEnhanceSevice.update(
        info,
        { id }
      )
      if (oldObj.tag_from !== info.tag_from
        || oldObj.tag_to !== info.tag_to
        || oldObj.tag !== info.tag
        || oldObj.topn < info.topn) {
        await this.tagEnhanceSevice.createTagRec(id, info)
      }
    } else {
      const oldObj = await this.tagEnhanceSevice.findOne({ name: info.name, project_id: info.project_id })
      if (oldObj) {
        return ctx.body = Response.fail('分析名称已存在')
      }
      id = shortid()
      await this.tagEnhanceSevice.create({
        id,
        ...info
      })
      await this.tagEnhanceSevice.createTagRec(id, info)
    }
    return ctx.body = Response.ok('')
  }

  getValueEnhanceList = async (ctx) => {
    let { projId = '' } = ctx.q
    let res = await this.tagEnhanceSevice.findAll({ project_id: projId })
    for (let item of res) {
      item = item.get({ plain: true })
      const { tagRecStatus } = await this.getValueEnhanceInfo(item.id, true)
      item.tagRecStatus = tagRecStatus
    }
    res = _.orderBy(res, ['created_at'], ['desc'])
    return ctx.body = Response.ok(res)
  }

  getValueEnhanceById = async (ctx) => {
    let { id } = ctx.params
    let res = await this.tagEnhanceSevice.findOne({ id })
    res = res.get({ plain: true })
    let { tagRecStatus, tagRecUser } = await this.getValueEnhanceInfo(id)
    tagRecUser = _.take(tagRecUser, res.topn || 0)
    res.tagRecStatus = tagRecStatus
    const info = _.pick(res,['id', 'tag', 'tag_from', 'tag_to', 'topn'])
    let md5 = CryptoJS.MD5(JSON.stringify(info)).toString()
    await SegmentServices.query({
      id: TagEnhanceAttr + md5,
      params: {
        createMethod: 'by-upload',
        md5: TagEnhanceAttr + md5
      },
      usergroupIds: tagRecUser.map(p => p.user_id)
    })
    return ctx.body = Response.ok(res)
  }

  getValueEnhanceInfo = async (id, isList = false) => {
    let tagRecStatus = {}
    let tagRecUser = []
    try {
      tagRecStatus = await this.tagEnhanceSevice.getTagRecStatus(id)
      if (!isList && tagRecStatus && tagRecStatus.status === 2) {
        let res = await this.tagEnhanceSevice.getTagRec(id)
        tagRecUser = res.result
      }
      return { tagRecStatus, tagRecUser }
    } catch (e) {
      return { tagRecStatus, tagRecUser }
    }
  }

  delValueEnhance = async (ctx) => {
    let { id } = ctx.q
    await this.tagEnhanceSevice.remove({ id })
    return ctx.body = Response.ok('')
  }

  recalculateValueEnhance = async (ctx) => {
    let { id } = ctx.q
    let obj = await this.tagEnhanceSevice.findOne({ id })
    obj = obj.get({ plain: true })
    await this.tagEnhanceSevice.createTagRec(id, obj)
    return ctx.body = Response.ok('')
  }
}
export default TagValeuEnhanceController.getInstance()
