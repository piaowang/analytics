/*
 * @Author: your name
 * @Date: 2020-06-22 10:22:41
 * @LastEditTime: 2020-06-24 19:40:10
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \sugo-analytics\src\server\models\apis\mannings-api.js
 */ 
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/manning.controller'
}

const routes = [
  {
    path: '/mannings/report',
    title: '个人视图列表',
    method: 'get',
    func: 'report'
  },
  {
    path: '/app/mannings/list',
    title: '视图列表',
    method: 'post',
    func: 'list'
  },
  {
    path: '/app/mannings/getMap',
    title: '打开视图',
    method: 'get',
    func: 'getMap'
  },
  {
    path: '/app/mannings/add',
    title: '添加视图报告',
    method: 'post',
    func: 'add'
  },
  {
    path: '/app/mannings/del',
    title: '删除视图报告',
    method: 'post',
    func: 'del'
  },
  {
    path: '/app/mannings/save',
    title: '更新视图报告',
    method: 'post',
    func: 'save'
  },
  {
    path: '/app/mannings/getRoleReport',
    title: '获取角色视图',
    method: 'post',
    func: 'getRoleReport'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
