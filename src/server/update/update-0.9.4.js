import { log } from '../utils/log'
import { rawQuery } from '../utils/db-utils'
import SupervisorService from '../services/druid-supervisor.service'
import DataSourceService from '../services/sugo-datasource.service'

export default async db => {
  
  const sql = [
    // 增加`from_datasource`列表示该项目由数据源迁移而来，以方便之后恢复或更新
    'alter table sugo_projects add from_datasource int default 0',
    // 将数据源直接插入项目中
    `insert into sugo_projects
      (
        id, name, datasource_id, datasource_name, 
        company_id, status, 
        created_by, updated_by, created_at, updated_at, from_datasource
      )
     select
       id, title as name, id as datasource_id, "taskId" as datasource_name,
       company_id, status,
       created_by, updated_by,
       "createdAt" as created_at, "updatedAt" as updated_at, 1
     from sugo_datasources
     where "taskId" is not null
     and "taskId" != ''
     and "taskId" not in (
       select datasource_name from sugo_projects
     )
    `
  ]
  
  // // 如果出错，还原
  // const resetSql = [
  //   'alter table sugo_projects drop from_datasource',
  //   'delete from sugo_projects where from_datasource = 1'
  // ]
  
  await rawQuery(db, sql)
  
  await db.client.transaction(async t => {
    
    const transaction = { transaction: t }
    
    // 如果数据源为启用状态状态，需要将其先停用，再启用
    // 以将其变为动态列数据源
    const projects = await db.SugoProjects.findAll({ where: { from_datasource: 1, status: 1 } })
    
    try {
      for (let p of projects) {
        console.log(p.datasource_name, p.name)
        await SupervisorService.shutdownSupervisor(p.datasource_name)
        await DataSourceService.createDefaultSupervisor(p.datasource_id, p.id, p.company_id)
      }
    } catch (e) {
      console.error('supervisor error => %s', e.message)
      console.error('supervisor error => %s', e.stack)
    }
    
    const result = await db.Route.findAll({
      where: { path: '/console/datasource' },
      ...transaction
    })
    
    await db.SugoRoleRoute.destroy({
      where: {
        route_id: result.id
      },
      ...transaction
    })
    
    await db.Meta.create({
      name: 'update-log',
      value: '0.9.4'
    }, transaction)
    
    await db.Meta.update({
      value: '0.9.4'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })
  
  log('update 0.9.4 done')
  
}
