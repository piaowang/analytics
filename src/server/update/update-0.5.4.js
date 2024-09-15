import { log, err } from '../utils/log'

/**
ALTER TABLE sugo_datasources RENAME "userCde" TO "userId";
ALTER TABLE sugo_datasources ALTER column "createdAt" type timestamptz;
ALTER TABLE sugo_datasources ALTER column "updatedAt" type timestamptz;
ALTER TABLE sugo_dimensions ALTER column "createdAt" type timestamptz;
ALTER TABLE sugo_dimensions ALTER column "updatedAt" type timestamptz;
ALTER TABLE sugo_subscribe RENAME "createdAt" TO "created_at";
ALTER TABLE sugo_subscribe RENAME "updatedAt" TO "updated_at";
 */

export default async db => {
  
  const alterSQLs = [
    'ALTER TABLE sugo_datasources RENAME "userCde" TO "userId";',
    'ALTER TABLE sugo_datasources ALTER column "createdAt" type timestamptz;',
    'ALTER TABLE sugo_datasources ALTER column "updatedAt" type timestamptz;',
    'ALTER TABLE sugo_dimensions ALTER column "createdAt" type timestamptz;',
    'ALTER TABLE sugo_dimensions ALTER column "updatedAt" type timestamptz;',
    'ALTER TABLE sugo_subscribe RENAME "createdAt" TO "created_at";',
    'ALTER TABLE sugo_subscribe RENAME "updatedAt" TO "updated_at";'
  ]

  for (let sql of alterSQLs){
    try {
      await db.client.query(sql, { type: db.client.QueryTypes.RAW })
    } catch(e) {
      err(e.stack)
      err('run', sql, 'not ok')
    }
  }

  await db.Meta.update({
    value: '0.5.4'
  }, {
    where: {
      name: 'version'
    }
  })
  log('update 0.5.4 done')
}
