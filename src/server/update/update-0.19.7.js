/**
 * @author heganjie
 * @date   2017/12/05
 * @description 去掉后端路由路径中多余的斜杠（会导致 pathToRegex 无法匹配）
 */
import {log} from '../utils/log'

export default async db => {

  const version = '0.19.7'

  const apis = [
    {
      prev: ['post', '/app/slices/create/slices/'],
      next: ['post', '/app/slices/create/slices']
    },
    {
      prev: ['post', '/app/slices/update/slices/'],
      next: ['post', '/app/slices/update/slices']
    },
    {
      prev: ['post', '/app/slices/delete/slices/'],
      next: ['post', '/app/slices/delete/slices']
    },
    {
      prev: ['post', '/app/slices/userAction/'],
      next: ['post', '/app/slices/userAction']
    },
    {
      prev: ['post', '/app/user-tag-update-tasks/'],
      next: ['post', '/app/user-tag-update-tasks']
    }
  ]

  await db.client.transaction(async t => {
    const transaction = {transaction: t}

    for (let api of apis) {
      await db.SugoRoleRoute.update({
        route_id: `${api.next[0]}#${api.next[1]}`
      }, {
        where: {
          route_id: `${api.prev[0]}#${api.prev[1]}`
        },
        transaction: t
      })
    }

    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)
  
    await db.Meta.update({
      value: version
    },
    {
      where: {name: 'version'},
      ...transaction
    }
    )
  
    log(`update ${version} done`)
  })
}
