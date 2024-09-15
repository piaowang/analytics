/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2018/03/13
 * @description update-0.18.8 标签字典表从uindex迁移到postgresql
 * 测试fix-5124分支时，需要将uindex的标签字典表迁移到postgresql，该文件为测试时使用
 */

import {QUERY_ENGINE} from '../../common/constants'
import DruidQueryService from '../services/druid-query.service'
import {initDruid} from '../utils/druid-middleware'
import moment from 'moment'
import shortid from 'shortid'
import sequelize from 'sequelize'
import {log} from '../utils/log'
import Config from '../config'

/**
 * 迁移uindex中的数据到postgresql，注意使用的是db.tagsClient实例而非db.client实例
 * @param db
 * @return {Promise.<void>}
 */
async function migrate(db) {
  await initDruid()
  const transaction = await db.tagsClient.transaction({autocommit: false})
  const projects = await db.SugoProjects.findAll({
    where: {
      reference_tag_name: {
        $not: null
      }
    }
  })

  for (const project of projects) {
    const sql = `select count(*) as total from ${project.reference_tag_name}`
    const result = await DruidQueryService.queryBySQL(sql, QUERY_ENGINE.UINDEX)
    const total = result.data[0].total

    if (total > 0) {
      // 先检测该表存在不
      const QueryTagDictTable = `select * from pg_tables where schemaname = 'public' and tablename = '${project.reference_tag_name}'`
      const QueryTableResult = await db.tagsClient.query(QueryTagDictTable, {
        type: sequelize.QueryTypes.SELECT
      })

      // 表存在则删除
      if (QueryTableResult.length > 0) {
        await db.tagsClient.query(`drop table ${project.reference_tag_name}`)
      }

      // create table
      const CreateTableSQL = `create table if not exists ${project.reference_tag_name} (
        id varchar primary key ,
        __time timestamptz,
        name varchar,
        tag_name varchar,
        tag_value varchar,
        type varchar
      )`

      await db.tagsClient.query(CreateTableSQL, {
        type: sequelize.QueryTypes.CREATE,
        transaction
      })

      // import database
      const lines = 100
      let start = 0

      do {
        const QueryValuesSQL = `select * from ${project.reference_tag_name} limit ${start},${lines}`
        const ResultValues = await DruidQueryService.queryBySQL(QueryValuesSQL, QUERY_ENGINE.UINDEX)

        const ValuesSQL = ResultValues.data.map(function (o) {
          return `('${shortid()}', '${moment(o.__time).toISOString()}', '${o.name}', '${o.tag_name}', '${o.tag_value}', ${o.type})`
        }).join(',')

        const InsertValuesSQL = `insert into ${project.reference_tag_name} (id, __time, name, tag_name, tag_value, type) values ${ValuesSQL}`
        await db.tagsClient.query(InsertValuesSQL, {
          type: sequelize.QueryTypes.INSERT,
          transaction
        })

        start = start + lines
      } while (start < total)
    }
  }

  return transaction
}

export default async function (db) {
  const version = '0.18.8'
  await db.client.transaction(async t => {
    const transaction = {transaction: t}

    let migrateTransaction = null
    if (Config.tagsDb !== null) {
      migrateTransaction = await migrate(db)
    }

    log('tag dict data migrated')

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

    if (migrateTransaction !== null) {
      await migrateTransaction.commit()
    }

    log(`update ${version} done`)
  })
}
