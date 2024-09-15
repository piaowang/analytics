import db from '../models'
import config from '../config'
import {extractFileNameFromPath} from '../../common/sugo-utils'
import _ from 'lodash'

function queryOne(where) {
  return db.UploadedFiles.findOne({
    where
  })
}

async function deleteById(fileId) {
  if (!fileId) {
    throw new Error('invalid file id')
  }
  let query = {
    where: {
      id: fileId
    }
  }
  // 判断文件是否被引用
  let hasUse = await db.SugoLiveScreen.findOne({where: { $or: [{background_image_id: fileId}, {cover_image_id:fileId }]}, raw:true})
  if(hasUse && hasUse.id) {
    return  `文件已被大屏[${hasUse.title}]引用`
  } 
  hasUse = await db.SugoLivescreenPublish.findOne({where: { $or: [{background_image_id: fileId}, {cover_image_id:fileId }]}, raw:true})
  if(hasUse && hasUse.id) {
    return  `文件已被已发布大屏[${hasUse.title}]引用`
  } 
  let preDelFile = await db.UploadedFiles.findOne(query)
  
  if(!_.get(preDelFile, 'path' ,'')) {
    return '文件不存在！'
  }
  let delResult = await fetch(`${config.site.file_server_url}/api/del-file`, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      filename: extractFileNameFromPath(preDelFile.path),
      secret: config.site.file_server_secret,
      token:  config.site.file_server_token
    })
  })
  if (300 <= delResult.status) {
    throw new Error(`Delete failure: ${await (delResult.text())}`)
  }
  await preDelFile.destroy()
  return ''
}

export default {
  queryOne,
  deleteById
}
