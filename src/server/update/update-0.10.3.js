import { log } from '../utils/log'
import { rawQueryWithTransaction } from '../utils/db-utils'
import { ProjectState, ProjectStatus } from '../../common/constants'

export default async db => {
  
  let arr1 = [
    'ALTER TABLE sugo_projects ADD COLUMN state INT DEFAULT 1'
  ]
  
  await db.client.transaction(async t => {
    const transaction = { transaction: t }
    
    await rawQueryWithTransaction(db, arr1, t)
    
    const paths = [
      '/app/project/stop/:project_id',
      '/app/project/run/:project_id'
    ]
   
    // 删除路由
    await db.Route.destroy({
      where: {
        path: {
          $in: paths
        }
      },
      ...transaction
    })
    
    // 设置所有的项目的状态
    // 如果 status 为 1，state = 1
    // status 为 0， state = 0
    
    await db.SugoProjects.update(
      {
        state: ProjectState.Activate
      },
      {
        where: {
          status: ProjectStatus.Show
        },
        ...transaction
      }
    )
    
    await db.SugoProjects.update(
      {
        state: ProjectState.Disable
      },
      {
        where: {
          status: ProjectStatus.Hide
        },
        ...transaction
      }
    )
    
    await db.Meta.create({
      name: 'update-log',
      value: '0.10.3'
    }, transaction)
    
    await db.Meta.update({
      value: '0.10.3'
    }, {
      where: { name: 'version' },
      ...transaction
    })
    
  })
  
  log('update 0.10.3 done')
}
