import { BaseService } from './base.service'
import db from '../models'
import { generate } from 'shortid'
import dataCheckingService from './data-checking.service'
import _ from 'lodash'

// 机构草稿表service
export default class InstitutionsDraftService extends BaseService {
  static instance = null
  constructor() {
    super('SugoInstitutionsDraft')
  }

  static getInstance(){
    if(!this.instance){
      this.instance = new InstitutionsDraftService()
    }
    return this.instance
  }

  async treeData(where, other = {}) {
    let res =  await this.dbInstance.findAll({
      include: [{
        model: db.SugoDataChecking,
        where: {type: 3},
        attributes: ['operationType', ['status', 'checkStatus']]
      },
      {
        required: false,
        model: db['SugoInstitutionsRole']
      },
      {
        required: false,
        model: db['SugoUser']
      }
      ],
      order: [['updated_at', 'DESC']]
    })
    return res
  }

  async findOne(where, other = {}) {
    return await this.dbInstance.findOne({
      where,
      ...other
    })
  }

  async create(data, roleIds, checkStatus = -1) {
    let CheckingService = new dataCheckingService()
    return await this.client.transaction(async (transaction) => {
      const res = await this.dbInstance.create(data, {transaction})
      let record = {
        institutionsDraftId:res.id,
        type:3,
        applyId:data.updated_by,
        operationType:1,
        status: checkStatus
      }
      await CheckingService.addCheckData(record,transaction)
    })
    
  }

  async delete(id) {
    let CheckingService = new dataCheckingService()
    return await this.client.transaction(async (transaction) => {
      await CheckingService.deleteCheckData({institutionsDraftId: id, type: 3}, transaction)
      await this.remove({id},{transaction})
    })
    
  }

  async update(data, institutions_id, roleIds, checkData) {
    let CheckingService = new dataCheckingService()
    return await this.client.transaction(async (transaction) => {
      await this.dbInstance.update(data, {where: {id: institutions_id}}, {transaction})
      await CheckingService.updateCheckData(checkData, {institutionsDraftId: institutions_id, type: 3}, transaction)
    })
    
  }

  async import(data, userId) {
    let err = undefined
    const dbInstance = this.dbInstance
    // const dbInstitutionsRole = db['SugoInstitutionsRole']
    // 先生成id
    let tempDatas = data.map(item => {
      return {
        ...item,
        id: generate(),
        created_by: userId,
        updated_by: userId
      }
    })

    // 生成机构层级
    const initLevel = (node, index) => {
      const parent = node.parent
      if (index >= tempDatas.length) { // 防止父层级的循环引用
        err = '存在上层机构的循环引用'
        return -1000
      }
      if (parent) {
        const parentNode = tempDatas.find(item => (item.name === parent || item.serial_number === parent))
        if (!parentNode) {
          err = `${node.name}的上层机构不存在`
          return -1000
        }
        if (!parentNode.level) {
          node.level = initLevel(parentNode, index+1) + 1
          return -1000
        }
        node.level = parentNode.level + 1
        return node.level
      }
      node.level = 1
      return node.level
    }

    tempDatas.forEach (item => initLevel(item, 0))
    if (err) {
      return {
        success: false,
        message: err
      }
    }

    // 修正上层机构的id, 修正status
    const institutionDatas = []
    for(let i=0; i<tempDatas.length; i+=1) {
      const row = tempDatas[i]
      const parent = row.parent
      let parentId = ''
      if (parent) {
        const parentNode = tempDatas.find(item => (item.name === parent || item.serial_number === parent ))
        if (parentNode) {
          parentId = parentNode && parentNode.id
        }
      }
      institutionDatas.push({
        ...row,
        status: row.status === '在用' ? 1 : 0,
        parent: parentId
      })
    }


    // 判断编号和名称是否重复
    const has = await dbInstance.findAll({
      where: {
        serial_number: {$in: institutionDatas.map(({serial_number}) => serial_number)},
        name: {$in: institutionDatas.map(({name}) => name)}
      },
      raw: true
    })
    if (has.length > 0) {
      return {
        success: false,
        message: '机构名或者机构编号重复',
        data: has
      }
    }
     
    const createAt = await dbInstance.bulkCreate(institutionDatas)
    return {
      success: true,
      message: '创建成功',
      data: createAt
    }
  }

  //更新复核表，包括提交复核，撤销，修改，删除，审核通过，审核不通过
  async updateCheck(data={}) {
    //正式表
    const dbInstitutions = db['SugoInstitutions']

    let CheckingService = new dataCheckingService()
    if (data.id) {
      return await this.client.transaction(async (transaction) => {
        //撤销
        // 新增待审核撤销 直接更新复核表status
        // 删除待审核撤销 直接更新复核表status
        await CheckingService.updateCheckData(_.omit(data, ['id', 'modify']), {institutionsDraftId: data.id, type: 3}, transaction)
        
        // 正式表数据更新到草稿表
        if (data.modify) {
          let row = await dbInstitutions.findOne({where: {id: data.id}}) 
          const newData = {
            id: row.id,
            name: row.name,
            serial_number: row.serial_number,
            parent: row.parent || '',
            level: row.level,
            status: row.status,
            description: row.description,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            created_by: row.created_by,
            created_at:row.created_at
          }
          return await this.dbInstance.update(newData, {where: {id: data.id}}, {transaction})
        }

        //审核
        //新增待审核、修改待审核， 审核通过
        if (data.operationType && data.operationType === 2 && data.status === 1) {
          let row = await this.dbInstance.findOne({where: {id: data.id}})    
          let row1 = await dbInstitutions.findOne({where: {id: data.id}})    
          const newData = {
            id: row.id,
            name: row.name,
            serial_number: row.serial_number,
            parent: row.parent || '',
            level: row.level,
            status: row.status,
            description: row.description,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            created_by: row.created_by,
            created_at:row.created_at
          }
          return _.isEmpty(row1) ? await dbInstitutions.create(newData, {transaction})
            : await dbInstitutions.update(newData, {where: {id: data.id}}, {transaction})
        }
        //删除待审核， 审核通过
        if (data.operationType && data.operationType === 3 && data.status === 1) {
          await CheckingService.deleteCheckData({institutionsDraftId: data.id, type: 3}, transaction)
          await this.remove({id: data.id}, {transaction})
          return await dbInstitutions.destroy({where: {id: data.id}}, {transaction})
        }
      })
    }
  }
  
  async updateCheckWithTrans(data = {}, transaction) {
    //正式表
    const dbInstitutions = db['SugoInstitutions']

    let CheckingService = new dataCheckingService()
    if (data.id) {
      // 拒绝  正式表数据更新到草稿表
      if (!data.ctrStatus) {
        if(data.operationType === 2){
          let row = await dbInstitutions.findOne({
            where: {
              id: data.id
            }
          })
          const newData = {
            id: row.id,
            name: row.name,
            serial_number: row.serial_number,
            parent: row.parent || '',
            level: row.level,
            status: row.status,
            description: row.description,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            created_by: row.created_by,
            created_at: row.created_at
          }
          await this.dbInstance.update(newData, {
            where: {
              id: data.id
            }
          }, {
            transaction
          })
          data.status = 1
          return await CheckingService.updateCheckData(_.omit(data, ['id', 'modify','ctrStatus']), {
            institutionsDraftId: data.id,
            type: 3
          }, transaction)
        }else{
          data.status = 2
          return await CheckingService.updateCheckData(_.omit(data, ['id', 'modify','ctrStatus']), {
            institutionsDraftId: data.id,
            type: 3
          }, transaction)
        }

      }

      //审核
      //新增待审核、修改待审核， 审核通过
      if ((data.operationType === 1 || data.operationType === 2) && data.ctrStatus) {
        let row = await this.dbInstance.findOne({
          where: {
            id: data.id
          }
        })
        let row1 = await dbInstitutions.findOne({
          where: {
            id: data.id
          }
        })
        const newData = {
          id: row.id,
          name: row.name,
          serial_number: row.serial_number,
          parent: row.parent || '',
          level: row.level,
          status: row.status,
          description: row.description,
          updated_by: row.updated_by,
          updated_at: row.updated_at,
          created_by: row.created_by,
          created_at: row.created_at
        }
        
        data.status = 1
        await CheckingService.updateCheckData(_.omit(data, ['id', 'modify','ctrStatus']), {
          institutionsDraftId: data.id,
          type: 3
        }, transaction)

        return _.isEmpty(row1) ? await dbInstitutions.create(newData, {
          transaction
        }) :
          await dbInstitutions.update(newData, {
            where: {
              id: data.id
            }
          }, {
            transaction
          })
      }
      //删除待审核， 审核通过
      if (data.operationType && data.operationType === 3 && data.ctrStatus) {
        await CheckingService.deleteCheckData({
          institutionsDraftId: data.id,
          type: 3
        }, transaction)
        // 删除草稿表几率
        await this.remove({
          id: data.id
        }, {
          transaction
        })
        // 删除正式表记录
        return await dbInstitutions.destroy({
          where: {
            id: data.id
          },
          // 原生sequelize实例
          transaction
        })
      }
    }
  }
}
