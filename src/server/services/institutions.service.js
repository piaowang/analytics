import { BaseService } from './base.service'
import db from '../models'
import { generate } from 'shortid'
import _ from 'lodash'

export default class InstitutionsService extends BaseService {
  static instance = null

  constructor() {
    super('SugoInstitutions')
  }

  static getInstance() {
    if (InstitutionsService.instance === null) {
      InstitutionsService.instance = new InstitutionsService()
    }
    return InstitutionsService.instance
  }

  async treeData(where, other = {}) {
    const include = [
      {
        required: false,
        model: db['SugoInstitutionsRole']
      },
      {
        required: false,
        model: db['SugoUser']
      }
    ]

    return await this.dbInstance.findAll({
      where,
      include,
      order: [['updated_at', 'DESC']],
      ...other
    })
  }

  async findOne(where, other = {}) {
    const include = [
      {
        required: false,
        model: db['SugoInstitutionsRole'],
        include: [
          {
            required: false,
            model: db['SugoRole']
          }
        ]
      }
    ]
    return await this.dbInstance.findOne({
      where,
      include,
      ...other
    })
  }

  async create(data, roleIds) {
    const dbInstance = this.dbInstance
    const dbInstitutionsRole = db['SugoInstitutionsRole']

    return await this.client.transaction(async transaction => {
      const { id: institutions_id } = await dbInstance.create(data, { transaction })
      const records = roleIds.map(id => ({ institutions_id, role_id: id }))

      await dbInstitutionsRole.bulkCreate(records, { transaction })
    })
  }

  async update(data, institutions_id, roleIds) {
    // const dbInstitutionsRole = db['SugoInstitutionsRole']

    return await this.client.transaction(async transaction => {
      await this.dbInstance.update(data, { where: { id: institutions_id } }, { transaction })
      //机构暂不修改角色
      // await dbInstitutionsRole.destroy({where: {institutions_id}}, {transaction})
      // const records = roleIds.map(id => ({institutions_id, role_id: id}))
      // await dbInstitutionsRole.bulkCreate(records, {transaction})
    })
  }

  async import(data, userId, opts = { createDisabled: true }) {
    const { createDisabled = true } = opts || {}
    // console.log('import -> data', data)
    let err = undefined
    const dbInstance = this.dbInstance
    // const dbInstitutionsRole = db['SugoInstitutionsRole']

    // 先生成id，如果对象已存在，则读取原 id
    const user = await db.SugoUser.findByPk(userId)
    const currInstitutions = await dbInstance.findAll({
      where: {
        serial_number: { $in: _.map(data, d => d.serial_number) },
        company_id: user.company_id
      },
      raw: true
    })
    const institutionDict = _.keyBy(currInstitutions, d => d.serial_number)
    let tempDatas = data.map(item => {
      return {
        ...item,
        id: institutionDict[item.serial_number]?.id || generate(),
        company_id: user.company_id,
        created_by: userId,
        updated_by: userId
      }
    })

    // 生成机构层级
    const initLevel = (node, index) => {
      const parent = node.parent
      if (index >= tempDatas.length) {
        // 防止父层级的循环引用
        err = '存在上层机构的循环引用'
        return -1000
      }
      if (parent) {
        const parentNode = tempDatas.find(item => item.name === parent || item.serial_number === parent)
        if (!parentNode) {
          err = `${node.name}的上层机构不存在`
          return -1000
        }
        if (!parentNode.level) {
          node.level = initLevel(parentNode, index + 1) + 1
          return -1000
        }
        node.level = parentNode.level + 1
        return node.level
      }
      node.level = 1
      return node.level
    }

    tempDatas.forEach(item => initLevel(item, 0))
    if (err) {
      return {
        success: false,
        message: err
      }
    }

    // 修正上层机构的id, 修正status
    const institutionDatas = []
    for (let i = 0; i < tempDatas.length; i += 1) {
      const row = tempDatas[i]
      const parent = row.parent
      let parentId = ''
      if (parent) {
        const parentNode = tempDatas.find(item => item.name === parent || item.serial_number === parent)
        if (parentNode) {
          parentId = parentNode && parentNode.id
        }
      }
      institutionDatas.push({
        ...row,
        status: row.status === '启用' ? 1 : 2,
        parent: parentId
      })
    }

    // 判断编号和名称是否重复，重复的话且不同则修改，不存在则创建
    const created = await this.client.transaction(async transaction => {
      const has = await dbInstance.findAll({
        where: {
          serial_number: { $in: institutionDatas.map(({ serial_number }) => serial_number) }
          // name: {$in: institutionDatas.map(({name}) => name)}
        },
        raw: true,
        transaction
      })

      const existedSerialNumbersSet = new Set(_.map(has, d => d.serial_number))
      const [existedInstitutions, preCreateInstitutions] = _.partition(institutionDatas, d => existedSerialNumbersSet.has(d.serial_number))
      const existedKeyDict = _.keyBy(has, d => d.serial_number)
      const needUpdateInstitutions = _.filter(existedInstitutions, ins => {
        const existed = existedKeyDict[ins.serial_number]
        return _.some(_.keys(ins), k => (k === 'id' ? false : ins[k] !== existed[k]))
      })
      for (const ins of needUpdateInstitutions) {
        await dbInstance.update(_.omit(ins, 'id'), { where: { serial_number: ins.serial_number } }, { transaction })
      }
      const preCreates = createDisabled ? preCreateInstitutions : _.filter(preCreateInstitutions, ins => ins.status === 1)
      return await dbInstance.bulkCreate(preCreates, { transaction })
    })

    return {
      success: true,
      message: '创建成功',
      data: created
    }
  }

  async delete(id) {
    return await this.dbInstance.destroy({ where: { id } })
  }
}
