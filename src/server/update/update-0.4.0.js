import {generate} from 'shortid'
import CryptoJS from 'crypto-js'
import { log } from '../utils/log'

async function initRoles(db) {

  //admin role
  let adminRole = await db.SugoRole.findOne({
    where: {
      type: 'built-in',
      name: 'admin'
    }
  })

  //init admin role
  if (!adminRole) {
    await db.SugoRole.create({
      name: 'admin',
      id: generate(),
      type: 'built-in',
      description: '管理员'
    })
  }

}

async function doInsert (dus, db, name) {
  for (let i = 0, len = dus.length;i < len;i ++) {
    let du = dus[i]
    await db[name].create(du)
  }
}

async function migrateUsers(oldUsers, db) {

  log('start:migrate users')

  for(let i = 0, len = oldUsers.length;i < len;i ++) {
    let old = oldUsers[i]
    let {username, password, email, first_name} = old
    let id = generate()
    await db.SugoUser.create({
      id,
      username,
      first_name,
      password,
      email,
      type: username === 'admin' ? 'built-in' : 'user-created'
    })

    let rootRole = await db.SugoRole.findOne({
      name: 'admin',
      type: 'built-in'
    })

    await db.SugoUserRole.create({
      id: generate(),
      user_id: id,
      role_id: rootRole.id
    })

    //migrate dashboard user table
    let dus = await db.DashboardUser.findAll({
      where: {
        user_id: old.id
      }
    })
    dus = dus.map(dd => {
      let ddd = dd.get({ plain: true })
      ddd.user_id = id
      delete ddd.id
      return ddd
    })
    await doInsert(dus, db, 'SugoDashboardUser')

    //migrate usergroups
    let ugs = await db.Usergroup.findAll({
      where: {
        create_by: old.id
      }
    })
    
    ugs = ugs.map(dd => {
      let ddd = dd.get({ plain: true })
      ddd.create_by = id
      ddd.update_by = id
      ddd.user_id = id
      return ddd
    })
    await doInsert(ugs, db, 'Segment')

    //migrate subscribe
    let subs = await db.Subscribe.findAll({
      where: {
        user_id: old.id
      }
    })
    subs = subs.map(dd => {
      let ddd = dd.get({ plain: true })
      ddd.user_id = id
      delete ddd.id
      return ddd
    })

    await doInsert(subs, db, 'SugoSubscribe')

    //migrate overview
    if (username === 'admin') {
      let ovs = await db.Overview.findAll()
      ovs = ovs.map(dd => {
        let ddd = dd.get({ plain: true })
        ddd.create_by = id
        delete ddd.id
        return ddd
      })
      
      await doInsert(ovs, db, 'SugoOverview')
    }


    log('done:migrate users')
    //end
  }

}

async function addUsers(db) {

  return await db.SugoUser.create({
    id: generate(),
    username: 'admin',
    first_name: '创始管理员',
    password: CryptoJS.AES.encrypt('123456', 'sugo').toString(),
    email: 'root@example.com',
    type: 'built-in'
  })

}

async function initUsers(db) {

  //root user
  let rootUser = await db.SugoUser.findOne({
    where: {
      type: 'built-in',
      username: 'admin'
    }
  })

  //init root user
  if (!rootUser) {
    //migrate from old ab_user first
    let oldUsers = db.User ? (await db.User.findAll()).map(u => u.get({ plain: true })) : []
    if (oldUsers.length) await migrateUsers(oldUsers, db)
    //or init new user
    else await addUsers(db)
  }

}

export default async db => {
  await initRoles(db)
  await initUsers(db)
  await db.Meta.update({
    value: '0.4.0'
  }, {
    where: {
      name: 'version'
    }
  })
  log('update 0.4.0 done')
}
