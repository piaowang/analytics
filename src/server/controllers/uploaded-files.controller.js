import db from '../models'
import { returnError, returnResult } from '../utils/helper'
import UploadedFilesSvc from '../services/uploaded-files.service'
import proxy from 'http-proxy-middleware'
import c2k from 'koa2-connect'
import config from '../config'
import _ from 'lodash'
// 代理转发到文件服务器
const proxydFileMiddleware = c2k(proxy({
  target: `${config.site.file_server_url}`,
  changeOrigin: true,
  pathRewrite: {
    '^/app/uploaded-files/get-file/f' : '/f', // rewrite path
    '^/api/uploaded-files/get-file/f' : '/f', // rewrite path
    '^/app/uploaded-files/upload' : '/file', // rewrite path
    '^/api/uploaded-files/upload' : '/file' // rewrite path
  }
}))

async function getFiles(ctx) {
  let { user } = ctx.session
  let { company_id } = user || {}

  let  {type, fileId, path } = ctx.q

  let query = {
    where: {
      $or: [
        { company_id: company_id },
        { company_id: null }
      ]
    },
    order: [
      ['updated_at', 'DESC']
    ]
  }
  if (type) {
    query.where.type = type
  }
  if (fileId) {
    query.where.id = fileId
  }
  if (path) {
    query.where.path = path
  }

  // 如果是对外访问则不限制 company_id
  if (!user) {
    delete query.where.$or
  }

  let myCompanyFiles = await db.UploadedFiles.findAll(query)
  returnResult(ctx, myCompanyFiles)
}

async function createFile(ctx) {
  let {user} = ctx.session
  let {company_id, id: creator} = user

  if (_.isEmpty(ctx.q)) {
    return returnError(ctx, 'q is false')
  }

  let uploadedFileInfo = ctx.q

  let created = await db.UploadedFiles.create({
    ...uploadedFileInfo,
    company_id,
    created_by: creator
  })

  returnResult(ctx, created)
}

async function updateFile(ctx) {
  let {user} = ctx.session
  let {company_id, id: userId} = user

  if (!ctx.q) {
    returnError(ctx, 'q is false')
    return
  }

  let uploadedFile = ctx.q
  uploadedFile.updated_by = userId

  let res = await db.UploadedFiles.update(uploadedFile, {
    where: {
      id: uploadedFile.id,
      company_id
    }
  })

  returnResult(ctx, res)
}

async function deleteFile(ctx) {
  let {user} = ctx.session
  let {company_id, id: userId} = user

  let { fileId } = ctx.params

  let res = await UploadedFilesSvc.deleteById(fileId)
  if(res) {
    return returnResult(ctx, res)
  }
  returnResult(ctx, '')
}

async function downloadFile(ctx) {
  let {fileId} = ctx.params

  let file = await db.UploadedFiles.findOne({
    where: {
      id: fileId
    }
  })
  if (file) {
    // 代理转发到文件服务获取文件
    ctx.redirect(`/app/uploaded-files/get-file/${file.path}`)
  } else {
    returnError(ctx, 'file not found', 404)
  }
}

export default {
  getFiles,
  createFile,
  updateFile,
  deleteFile,
  downloadFile,
  getFile: proxydFileMiddleware,
  uploadFile: proxydFileMiddleware
}
