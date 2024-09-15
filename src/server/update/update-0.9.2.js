import { log } from '../utils/log'

export default async db => {
  
  await db.client.transaction(async t => {
    const transaction = { transaction: t }
    
    await db.Route.destroy({
      where: {
        path: {
          $in: [
            '/app/project/post/dimensions',
            '/app/project/associations'
          ]
        }
      },
      ...transaction
    })
    
    await db.Meta.create({
      name: 'update-log',
      value: '0.9.2'
    }, transaction)
    
    await db.Meta.update({
      value: '0.9.2'
    }, {
      where: { name: 'version' },
      ...transaction
    })
  })
  
  log('update 0.9.2 done')
}
