import { readdirSync } from 'fs'
import confs from '../config'
import { resolve, basename, extname } from 'path'
import compareVersion from '../../common/compare-version'
import { log, err, warn } from '../utils/log'
import {exec} from 'child_process'
import {platform} from 'os'
import {mkdir, statFile} from '../utils/fs-promise'

const cwd = process.cwd()
const pf = platform()
const pgDump = pf === 'linux' ? cwd + '/node_modules/sugo-pg/bin/pg_dump' : 'pg_dump'
const execPromise = function (...args) {
  return new Promise((resolve, reject) => {
    exec(...args, (err, stderr, stdout) => {
      if (err || stderr) reject(err || stderr)
      else resolve(stdout)
    })
  })
}

const dbConf = confs.db
const { pkg, autoBackup } = confs

//backup whole database to new db name = backupdb{timestamp}
export async function backup(newName, db) {
  if (autoBackup === false) return log('autoBackup=false, skip backup')
  try {
    //create backup database
    let path = resolve(cwd, '../sugo-astro-update-db-backup')
    let stats
    try {
      stats = await statFile(path)
    } catch(e) {
      log('no backup dir, create it')
      await mkdir(path)
    }
    
    if (stats && !stats.isDirectory()) {
      await mkdir(path)
    }

    await execPromise(`${pgDump} --host ${dbConf.host} --port ${dbConf.port} --username ${dbConf.username} --no-password  --format custom --blobs --verbose --file "${path}/${newName}" "${dbConf.database}"`)
    await db.Meta.create({
      name: 'backup-log-name',
      value: `${path}/${newName}`
    })
  } catch (e) {
    console.log(e)
    err('备份失败，请用数据库软件手动备份后，在config里设定 "autoBackup: false" 之后重启')
    process.exit(1)
  }

}

function getVer (f) {
  let ext = extname(f)
  if (ext !== '.js') return false
  let base = basename(f, ext)
  return base.replace('update-', '')
}

//do the update
async function doUpdate(sql, dbver) {

  log('start:', 'do updates')
  let files = readdirSync(__dirname)
  let shouldUpdates = files.filter(f => {
    let ext = extname(f)
    if (ext !== '.js') return false
    let ver = getVer(f)
    return compareVersion(ver, dbver) > 0 && compareVersion(ver, pkg.version) <= 0
  }).sort((a, b) => {
    let vera = getVer(a)
    let verb = getVer(b)
    return compareVersion(vera, verb)
  })

  if (shouldUpdates.length) {
    log('should do Updates:', shouldUpdates.join(','))
    log('start:back up db')
    let timestamp = new Date().getTime()
    let newName = `db-${dbConf.database}-bak-${timestamp}-before-${pkg.version}.backup`
    await backup(newName, sql)
    log('done:back up db to database:', newName)
  }

  for(let i = 0, len = shouldUpdates.length;i < len;i ++) {
    let up = shouldUpdates[i]
    try {
      await require('./' + up).default(sql)
    } catch(e) {
      if (/关系(.+)的属性(.+)已经存在/.test(e.message)) {
        warn(`ignore update @at ${up} =>`, e.message)
      } else {
        err('something bad happened: @update', up)
        err(e.stack || e)
        throw e
        // process.exit(-1)
      }
    }
  }

}

//check if should do update
export async function checkUpdate(sql) {

  let clusterId = process.env.NODE_APP_INSTANCE
  if (clusterId > 0) return

  let verNow = pkg.version
  let verDb = await sql.Meta.findOne({
    where: {
      name: 'version'
    }
  })

  if (!verDb) {
    await sql.Meta.create({
      name: 'version',
      value: verNow
    })
  }

  verDb = verDb || {
    name: 'version',
    value: verNow
  }

  let dbver = verDb.value

  if (compareVersion(dbver, verNow) >= 0) {
    log('db version:', dbver, 'no need for update')
    return
  }

  await doUpdate(sql, dbver)

  log('update done')

  return
}
