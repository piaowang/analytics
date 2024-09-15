import CopyWritingService from '../../services/marketing/copy-writing.service'
import { MARKETING_SEND_CHANNEL } from 'common/constants'
import { Response } from '../../utils/Response'
import _ from 'lodash'

export default class SugoMarketingCopyWritingController {

  constructor() {
    this.copyWritingService =  new CopyWritingService()
  }

  async getList(ctx) {
    const { page = 1, pageSize = 10, filter, send_channel } = ctx.q
    let {user} = ctx.session
    let { id: user_id } = user
    let query = {
      created_by: user_id,
      title: '',
      content: {
        $like: `%${filter}%`
      }
    }
    if (send_channel === MARKETING_SEND_CHANNEL.PUSH) query.title = { $and: [{ $like: `%${filter}%`}, { $ne: '' }]  }
    const res = await this.copyWritingService.findAndCountAll(query,{
      raw: true,
      limit: pageSize,
      offset: (page - 1) * pageSize, 
      order: [['created_at', 'DESC']]
    })
    ctx.body = Response.ok(res)
  }


  async create(ctx) {
    const { send_channel = undefined, copywriting } = ctx.q
    if (_.isUndefined(send_channel) || !copywriting) return ctx.body = Response.fail('缺少参数,文案保存失败')
    let {user} = ctx.session
    let { id: user_id } = user
    const { title = '', content = '' } = copywriting
    if (send_channel === MARKETING_SEND_CHANNEL.SMS && !_.isEmpty(title) || _.isEmpty(content))  return ctx.body = Response.fail('参数错误,文案保存失败')
    let existed = await this.copyWritingService.findOne({
      created_by: user_id,
      title,
      content
    }, { raw: true })
    if (!existed) {
      await this.copyWritingService.create({
        title,
        content,
        created_by: user_id
      })
    }
    return ctx.body = Response.ok()
  }

  async delete(ctx) {
  }
}
