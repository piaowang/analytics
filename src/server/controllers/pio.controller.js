/*
 * @Author: xuxinjiang
 * @Date: 2020-04-24 19:47:21
 * @LastEditors: your name
 * @LastEditTime: 2020-08-03 16:37:13
 * @Description: file content
 */

import pio from '../services/pio.service'
import { returnResult, returnError } from '../utils/helper'
import fs from 'fs'
import path from 'path'
import admzip from 'adm-zip'
import Config from '../config'
import db from '../models'
import FetchKit from '../utils/fetch-kit'

const getOperators = async (ctx) => {
  let res = await pio.getOperators()
  const demo = await db.SugoPioDemo.findAll({raw:true})

  if(demo){
    returnResult(ctx, res.concat(demo))
    return
  }
  returnError(ctx, '操作失败')
  
}
const saveApiFun = async (ctx)=>{
  const query = ctx.q
  query.registerHost = Config.pioUrl
  const apiService = Config.pioApiService || 'http://192.168.0.226:7060'
  const res = await FetchKit.post(`${apiService}/ds-api-service/develop/saveRegisterInfo`, query)
  if(res.success){
    returnResult(ctx, res)
    return 
  }
  returnError(ctx, '操作出错')
  

}

const getOperatorInfo = async (ctx) => {
  let { processId, operatorName, fullName } = ctx.q

  let res = await pio.getOperatorInfo(processId, operatorName)
  res.fullName = fullName
  res.description = fullName
  returnResult(ctx, res)
}

// 导出算子
const daoOut = async (ctx) => {
  const zip = new admzip()
  const content = JSON.stringify({
    category: '算法建模',
    categoryCode: 'algorithmModel',
    description: '决策树',
    fullName: '决策树',
    group: '分类算法',
    groupCode: 'classification',
    groupSequence: 0,
    name: 'demo-parallel_decision_tree',
    sequence: 0
  })
  zip.addFile(
    'Temp.json',
    Buffer.alloc(Buffer.byteLength(content, 'utf8'), content),
    'comment',
    null
  )
  const zipFilePath = path.resolve('/tmp', 'Temp')

  // 生成zip文件
  zip.writeZip('/' + zipFilePath)

  ctx.attachment('Temp.zip') // 设置下载文件名
  return (ctx.body = fs.createReadStream(zipFilePath))
}

const daoIn = async (ctx) => {
  const { fullName } = ctx.q
  const data = {
    category: '算法建模',
    categoryCode: 'algorithmModel',
    description: fullName,
    fullName,
    group: '分类算法',
    groupCode: 'classification',
    groupSequence: 0,
    name: `demo-${new Date().getTime()}-parallel_decision_tree`,
    sequence: 0
  }
  let res = await db.SugoPioDemo.create(data)
  if(res){
    returnResult(ctx, data)
    return 
  }
  returnError(ctx, '操作失败')
  

}
const jupyterPage = (ctx)=>{
  ctx.redirect(`${Config.site.jubyterHost}/tree/src?token=${Config.site.jubyterToken}`)
}

export default {
  getOperators,
  getOperatorInfo,
  daoOut,
  daoIn,
  jupyterPage,
  saveApiFun
}
