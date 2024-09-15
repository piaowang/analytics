import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'
import short_id from 'shortid'
import { AccessDataType, AccessDataOriginalType } from '../../common/constants'
import CryptoJS from 'crypto-js'

export default async db => {

  const version = '0.19.3'
  const projects = await db.SugoProjects.findAll({
    where: {
      access_type: AccessDataType.SDK
    },
    attributes: ['id']
  })

  const arr = [
    'ALTER TABLE sugo_projects ADD COLUMN extra_params JSONB DEFAULT \'{}\';'
  ]
  for (const project of projects) {
    const token = await db.SugoDataAnalysis.findOne({
      where: {
        access_type: AccessDataOriginalType.WxMini,
        project_id: project.id
      },
      attributes: ['id']
    })
    if (!token || !token.id) {
      arr.push(`INSERT INTO "sugo_data_analysis" 
        ("id","name", "type", "package_name", "access_type", "project_id", "status", "params", "created_by", "created_at","updated_at") 
        VALUES ('${CryptoJS.MD5(short_id()).toString()}','微信小程序', 0, NULL, 8, '${project.id}', 0, '{}', '', now(), now());`)
    }
  }

  await db.client.transaction(async t => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, arr, t)

    await db.Meta.create({
      name: 'update-log',
      value: version
    }, transaction)

    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      ...transaction
    })

    log(`update ${version} done`)
  })
}
