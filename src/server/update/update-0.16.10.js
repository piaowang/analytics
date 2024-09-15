import { log } from '../utils/log'

export default async db => {
  const version = '0.16.10'
  
  await db.client.transaction(async transaction => {
    const res = await db.SugoContacts.findAll()
    for (const obj of res) {
      const contact = obj.get({plain: true})
      if (!contact.name) {
        // 更新历史联系人名称：如果设置电话则以电话为名称否则以邮件为名称
        const name = contact.phone || contact.email
        await db.SugoContacts.update({ name }, {
          where: { id: contact.id },
          transaction
        })
      }
    }

    await db.Meta.create({
      name: 'update-log',
      value: version
    }, { transaction })

    await db.Meta.update({
      value: version
    }, {
      where: { name: 'version' },
      transaction
    })
  })

  log(`update ${version} done`)
}
