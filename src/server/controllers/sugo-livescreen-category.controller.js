import SugoLivescreenCategoryService from '../services/sugo-livescreen-category.service'
import { Response } from '../utils/Response'
import { generate } from 'shortid'
import _ from 'lodash'
import SugoLivescreenServices  from '../services/sugo-livescreen.service'

async function get(ctx) {
  const { user } = ctx.session
  const { id: user_id } = user
  const data = await SugoLivescreenCategoryService.getInstance().findAll({ created_by: user_id }, { raw: true })
  ctx.body = Response.ok(data)
  return 
}

async function create(ctx) {
  const { user } = ctx.session
  const { company_id, id: user_id } = user
  let { id, title } = ctx.q
  if (!id) {
    id = generate()
    const  res = await await SugoLivescreenCategoryService.getInstance().findOne({title}, {raw: true}) 
    if(!_.isEmpty(res)) {
      ctx.body = Response.fail('分组名称不允许重名')
      return
    }
    await SugoLivescreenCategoryService.getInstance().create({ id, title, company_id, created_by: user_id })
    ctx.body = Response.ok('')
    return
  }
}

async function del(ctx) {
  const { id } = ctx.params
  await SugoLivescreenServices.update({ category_id: '' }, { category_id: id })
  await SugoLivescreenCategoryService.getInstance().remove({ id })
  ctx.body = Response.ok('')
  return
}

async function update(ctx) {
  const { id } = ctx.params
  const { title } = ctx.q
  await SugoLivescreenCategoryService.getInstance().update({ title }, { id })
  ctx.body = Response.ok('')
  return
}

export default { get, create, del, update }