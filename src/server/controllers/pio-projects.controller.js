//import db from '../models'
import pio from '../services/pio.service'
import {returnResult, returnError} from '../utils/helper'

const get = async ctx => {
  let {id} = ctx.q
  //debug(id, 'id', ctx.q)
  let res = id
    ? await pio.getProcess(id)
    : await pio.getProcesses(ctx.session.user.company_id)
  returnResult(ctx, res)
}

const add = async ctx => {
  let {q} = ctx
  let res = await pio.createProcess(q, ctx.session.user.company_id)
  returnResult(ctx, res)
}

const del = async ctx => {
  let {id} = ctx.params
  let res = await pio.delProcesses(id)
  returnResult(ctx, res)
}

const update = async ctx => {
  let {id, data} = ctx.q
  let res = await pio.updateProcess(id, data)
  returnResult(ctx, res)
}
// 临时demo
const addProcessOperator = async ctx => {
  let {id, data} = ctx.q
  const arr = data.operatorType.split('-')
  if(arr.indexOf('demo')>=0){
    data.operatorType = arr[2]
  }
  let res = await pio.addProcessOperator(id, data)
  returnResult(ctx, res)
}

const delProcessOperator = async ctx => {
  let {processId, operatorName} = ctx.params
  let res = await pio.delProcessOperator(processId, operatorName)
  returnResult(ctx, res)
}

const updateProcessOperator = async ctx => {
  let {processId, operatorName, data} = ctx.q
  let res = await pio.updateProcessOperator(processId, operatorName, data)
  returnResult(ctx, res)
}

const updateOperatorInfo = async ctx => {
  let {processId, operatorName, data} = ctx.q
  let res = await pio.updateOperatorInfo(processId, operatorName, data)
  returnResult(ctx, res)
}

const connect = async ctx => {
  let {processId, data} = ctx.q
  let res = await pio.connect(processId, data)
  returnResult(ctx, res)
}

const disConnect = async ctx => {
  let {processId, data} = ctx.q
  let res = await pio.disConnect(processId, data)
  returnResult(ctx, res)
}

const run = async ctx => {
  let {processId} = ctx.q
  let res = await pio.runProcess(processId)
  returnResult(ctx, res)
}

const getOperatorResult = async ctx => {
  let {processId, operatorName} = ctx.q
  let res = await pio.getOperatorResult(processId, operatorName)
  returnResult(ctx, res)
}

const uploadProcessOperatorData = async ctx => {
  let {processId, operatorName, data} = ctx.q
  let res = await pio.uploadProcessOperatorData(processId, operatorName, data)
  returnResult(ctx, res)
}

/**
 * 创建模板项目
 * @param {*} ctx 
 */
const addTemplate = async ctx => {
  if(ctx.session.user.company.created_by) {
    returnError(ctx, '没有权限创建模板项目')
    return
  }
  let {q} = ctx
  let res = await pio.createTemplate(q, ctx.session.user.company_id)
  returnResult(ctx, res)
}

/**
 * 获取模板规格
 */
const getTemplateType = async ctx => {
  let res = await pio.getTemplateType()
  returnResult(ctx, res)
}

/**
 * 创建一个公用样例流程，只有管理员可以创建
 * @param {object} data 样例信息
 * @param {string} companyId 公司id
 */
const createCase = async ctx => {
  if(ctx.session.user.company.created_by) {
    returnError(ctx, '没有权限创建样例项目')
    return
  }
  let {q} = ctx
  let res = await pio.createCase(q, ctx.session.user.company_id)
  returnResult(ctx, res)
}

/**
 * 获取所有公用样例
 */
const getCase = async ctx => {
  let res = await pio.getCase()
  returnResult(ctx, res)
}

/**
 * 复制案例公用样例
 */
const cloneCase = async ctx => {
  let data = Object.assign({}, ctx.q)
  let res = await pio.cloneCase(data, ctx.session.user.company_id)
  returnResult(ctx, res)
}

/**
 * 运行到指定算子
 * @param {*} ctx 
 */
const runTo = async ctx => {
  let {processId, operatorId} = ctx.q
  let res = await pio.runTo(processId, operatorId)
  returnResult(ctx, res)
}

/**
 * 从指定算子开始运行
 * @param {*} ctx 
 */
const runFrom = async ctx => {
  let {processId, operatorId} = ctx.q
  let res = await pio.runFrom(processId, operatorId)
  returnResult(ctx, res)
}

/**
 * 克隆算子
 * @param {*} ctx 
 */
const cloneOperator = async ctx => {
  let {processId, operatorId, ...pos} = ctx.q
  let res = await pio.cloneOperator(processId, operatorId, pos)
  returnResult(ctx, res)
}

/**
 * 查看算子运行日志
 * @param {*} ctx 
 */
const logOperator = async ctx => {
  let {processId, operatorId} = ctx.q
  let res = await pio.logOperator(processId, operatorId)
  returnResult(ctx, res)
}

/**
 * 运行单个算子
 * @param {*} ctx 
 */
const runSingle = async ctx => {
  let {processId, operatorId} = ctx.q
  let res = await pio.runSingle(processId, operatorId)
  returnResult(ctx, res)
}

export default {
  add,
  get,
  update,
  del,
  delProcessOperator,
  updateProcessOperator,
  connect,
  disConnect,
  updateOperatorInfo,
  addProcessOperator,
  run,
  getOperatorResult,
  uploadProcessOperatorData,
  addTemplate,
  getTemplateType,
  createCase,
  getCase,
  cloneCase,
  runTo,
  runFrom,
  cloneOperator,
  logOperator,
  runSingle
}
