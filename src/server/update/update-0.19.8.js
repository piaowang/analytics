/**
 * 改造子项目逻辑
 * 1. 升级数据库：
 * 创建表 sugo_child_projects: id, projectId, name, filters roles;
 * 单图增加 child_project_id 列
 * 删除 sugo_project parent_id, sugo_datasources parent_id, filter 列， filter 记录到 sugo_child_projects；
 * 删除原有子项目的 sugo_datasources， 维度，指标
 * 2. 更改创建子项目的逻辑。只创建 sugo_child_projects，更改查询子项目的逻辑
 * 3. 更改删除项目逻辑
 * 3. 更改查询单图，查询单图数据的逻辑
 */
import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'
import _ from 'lodash'
import {mapAwaitAll} from '../../common/sugo-utils'
import ProjectSrv from '../services/sugo-project.service'

export default async db => {

  const version = '0.19.8'
  const addSliceCol = [
    'ALTER TABLE slices add child_project_id varchar(32);',
    `alter table slices
	add constraint slices_sugo_child_projects_id_fk
		foreign key (child_project_id) references sugo_child_projects
			on update cascade on delete cascade;`
  ]
  const dropUselessCol = [
    'alter table sugo_projects drop column parent_id;',
    'alter table sugo_datasources drop column filter;',
    'alter table sugo_datasources drop column parent_id;'
  ]

  await db.client.transaction(async t => {
    const transaction = { transaction: t }

    await rawQueryWithTransaction(db, addSliceCol, t)
    
    // 旧子项目数据迁移至新表
    let originalSubProjects = await db.SugoProjects.findAll({
      where: {
        parent_id: {$ne: null}
      },
      raw: true,
      attributes: ['id', 'name', 'datasource_id', 'status', 'created_by', 'updated_by', 'parent_id', 'company_id'],
      ...transaction
    })
    let originalSubDataSources = await db.SugoDatasources.findAll({
      where: {
        parent_id: {$ne: null}
      },
      raw: true,
      attributes: ['id', 'name', 'parent_id', 'filter', 'role_ids', 'company_id'],
      ...transaction
    })
    let sugoChildProjects = originalSubProjects.map(sp => {
      let originalSubDs = _.find(originalSubDataSources, {id: sp.datasource_id})
      return originalSubDs && {
        name: sp.name,
        project_id: sp.parent_id,
        status: sp.status,
        role_ids: originalSubDs.role_ids,
        params: {
          filters: _.get(originalSubDs.filter, 'filters')
        },
        created_by: sp.created_by,
        updated_by: sp.updated_by
      }
    }).filter(_.identity)

    await db.SugoChildProjects.bulkCreate(sugoChildProjects, transaction)
    let dbChildProjects = await db.SugoChildProjects.findAll({raw: true, ...transaction})
  
    const originalSubDsIds = originalSubDataSources.map(ds => ds.id)
    
    await mapAwaitAll(originalSubProjects, async sp => {
      let parentProj = await db.SugoProjects.findByPk(sp.parent_id, transaction)
      let childProj = _.find(dbChildProjects, {project_id: sp.parent_id, name: sp.name})
      // 迁移单图
      await db.Slices.update(
        {
          druid_datasource_id: parentProj.datasource_id,
          child_project_id: childProj.id
        },
        {
          where: {
            druid_datasource_id: sp.datasource_id
          },
          ...transaction
        }
      )
      const res = await ProjectSrv.deleteProj(sp, true, t)
      if (!res.success) {
        throw new Error(`Delete ${sp.name} fail`)
      }
      return res
    })
  
    await rawQueryWithTransaction(db, dropUselessCol, t)
    
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
