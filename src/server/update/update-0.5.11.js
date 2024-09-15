import { log } from '../utils/log'

export default async db => {

  await db.Route.update({
    title: '获取用户组列表'
  }, {
    where: {
      title: '获取角色列表'
    }  
  })

  await db.Route.update({
    title: '删除用户组'
  }, {
    where: {
      title: '删除角色'
    }
  })

  await db.Route.update({
    title: '创建用户组'
  }, {
    where: {
      title: '创建角色'
    }
  })

  await db.Route.update({
    title: '更新用户组'
  }, {
    where: {
      title: '更新角色'
    }
  })

  await db.Route.update({
    title: '更新用户组'
  }, {
    where: {
      title: '更新角色'
    }
  })

  await db.Route.update({
    title: '用户组管理'
  }, {
    where: {
      title: '角色管理'
    }
  })

  await db.Meta.create({
    name: 'update-log',
    value: '0.5.11'
  })

  await db.Route.update({
    group: '用户组'
  }, {
    where: {
      group: '角色'
    }
  })

  await db.Meta.update({
    value: '0.5.11'
  }, {
    where: {
      name: 'version'
    }
  })

  log('update 0.5.11 done')
}
