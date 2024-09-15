/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date   2017/02/09
 * @description 修复错误使用http delete方法
 */
import {log} from '../utils/log'

export default async db => {

  const version = '0.18.7'

  const apis = [
    {
      prev: ['delete', '/app/slices/delete/slices/'],
      next: ['post', '/app/slices/delete/slices/']
    },
    {
      prev: ['delete', '/app/proj/del'],
      next: ['delete', '/app/proj/del/:id']
    },
    {
      prev: ['delete', '/app/proj/del-process-operator'],
      next: ['delete', '/app/proj/del-process-operator/:processId/:operatorName']
    },
    {
      prev: ['delete', '/app/tag-group/delete'],
      next: ['post', '/app/tag-group/delete']
    },
    {
      prev: ['delete', '/app/tag-type/delete'],
      next: ['post', '/app/tag-type/delete']
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
