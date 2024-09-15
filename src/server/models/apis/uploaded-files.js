/*
 * @Author: xuxinjiang
 * @Date: 2020-04-24 19:47:21
 * @LastEditors: your name
 * @LastEditTime: 2020-07-03 13:47:14
 * @Description: file content
 */ 
const ctrl = 'controllers/uploaded-files.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  group: '文件上传下载'
}

// 上传/修改的时候，先上传到文件服务器，再在 pg 创建文件记录
// 文件的 path 是文件服务器返回路径
// 删除文件直接通过 id 删除

const routes = [
  {
    path: '/get',
    title: '查询所有文件信息',
    method: 'get',
    func: 'getFiles'
  }, {
    path: '/create',
    title: '创建文件信息',
    method: 'post',
    func: 'createFile'
  }, {
    path: '/update/:fileId',
    title: '更新文件信息',
    method: 'post',
    func: 'updateFile'
  }, {
    path: '/delete/:fileId',
    title: '删除文件以及文件信息',
    method: 'delete',
    func: 'deleteFile'
  },
  {
    // 解决跨域问题
    path: '/download/:fileId',
    title: '下载文件',
    method: 'get',
    func: 'downloadFile'
  },
  {
    // 解决跨域问题
    path: '/get-file/f/:id',
    title: '获取文件',
    method: 'get',
    func: 'getFile'
  },
  {
    // 通过路由转发到文件服务器，避免开放文件上传端口；仍然需要配置 token, url, secret
    path: '/upload',
    title: '上传文件',
    method: 'post',
    func: 'uploadFile'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/uploaded-files'
}
