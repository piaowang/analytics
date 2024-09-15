import { log } from '../utils/log'
import { AccessDataOriginalType } from '../../common/constants'
export default async db => {

  const version = '0.16.8'

  await db.client.transaction(async transaction => {

    await db.SugoDataAnalysis.update({ name: 'iOS接入' }, {
      where: {
        name: 'iOS',
        access_type: AccessDataOriginalType.Ios
      },
      transaction
    })

    await db.SugoDataAnalysis.update({ name: 'Android接入' }, {
      where: {
        name: 'Android',
        access_type: AccessDataOriginalType.Android
      },
      transaction
    })

    await db.SugoDataAnalysis.update({ name: 'Web接入' }, {
      where: {
        name: 'Web',
        access_type: AccessDataOriginalType.Web
      },
      transaction
    })

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
