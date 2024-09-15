import SugoOfflineCalcImportTablesService from '../services/sugo-offline-calc-import-tables.service'
import _ from 'lodash'
import {returnError, returnResult} from '../utils/helper'
import db from '../models'

async function query(ctx) {
  
  const serv = SugoOfflineCalcImportTablesService.getInstance()
  let res = await serv.findAll()
  returnResult(ctx, res)
}

async function create(ctx) {
  const values = ctx.q
  let {user} = ctx.session
  let {id} = user
  const { datasource_id, table_name, datasource, dimensionType, dimensionValue } = values
  let data = {
    datasource_id, 
    table_name,
    dimension_type: dimensionType
  }

  const serv = SugoOfflineCalcImportTablesService.getInstance()
  let res = await db.client.transaction(async (transaction) => { 

    //创建表记录
    let existed = await serv.findOne({
      ...data
    }, {
      raw: true,
      transaction
    })
    if (!existed)  await serv.create({...data, created_by: id},{transaction})

    //数据库建立真实表结构
    await serv.createTable({datasource, table_name, dimensionType})

    //导入数据
    await serv.importValues(datasource, table_name, dimensionType, dimensionValue, id, transaction)
  
  })


  returnResult(ctx, res)
}

async function importValues(ctx) {
  const values = ctx.q
  let {user} = ctx.session
  let {id} = user
  const { table_name, datasource, dimensionType, dimensionValue } = values

  const serv = SugoOfflineCalcImportTablesService.getInstance()
  let res = await db.client.transaction(async (transaction) => { 

    //导入数据
    await serv.importValues(datasource, table_name, dimensionType, dimensionValue, id, transaction)
  })
  returnResult(ctx, res)
}

async function update(ctx) {
  let modId = ctx.params.id
  let patch = _.isEmpty(ctx.q) ? ctx.request.body : ctx.q
  let {user} = ctx.session
  let {company_id, id} = user
  
  const serv = SugoOfflineCalcImportTablesService.getInstance()
  let preMod = await serv.__model.findByPk(modId)
  if (!preMod) {
    returnError(ctx, '该指标模型不存在')
    return
  }
  
  if (preMod.belongs_id === modId) {
    // 修改公有版本 产生一个新的私有版本
    preMod = preMod.get()
    preMod = {
      ..._.omit(preMod, ['id','created_at','created_by', 'updated_by']),
      ..._.omit(patch, 'id'),
      created_by: id
    }
    let res = await serv.create({...preMod, company_id, created_by: id})
    return returnResult(ctx, res)
  }

  
  let res = await serv.update({...patch, updated_by: id}, { id: modId, company_id })
  returnResult(ctx, res)
}

async function remove(ctx) {
  let delId = ctx.params.id
  
  const serv = SugoOfflineCalcImportTablesService.getInstance()
  let preDel = await serv.__model.findByPk(delId)
  if (!preDel) {
    returnError(ctx, '该指标模型不存在')
    return
  }
  
  let res = await serv.remove({id: delId})
  returnResult(ctx, res)
}

export default {
  query,
  create,
  importValues,
  update,
  remove
}
