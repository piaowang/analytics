/*
 * @Author: xuxinjiang
 * @Date: 2020-04-24 19:47:21
 * @LastEditors: your name
 * @LastEditTime: 2020-07-27 16:25:15
 * @Description: file content
 */ 
const ctrl = 'controllers/pio.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  method: 'get'
}

const routes = [
  {
    path: '/get-operators',
    title: 'get operators',
    func: 'getOperators'
  },
  {
    path: '/get-operators-info',
    title: 'get operators',
    func: 'getOperatorInfo'
  },
  {
    path: '/dao-out',
    title: '导出算账',
    func: 'daoOut'
  },
  {
    path: '/dao-in',
    title: '导入算账',
    func: 'daoIn'
  },
  {
    noAuth:true,
    path: '/go-jupyter',
    title: '跳转jupyter',
    func: 'jupyterPage'
  },
  {
    noAuth:true,
    path: '/saveApi',
    title: '发布api',
    func: 'saveApiFun'
  }
  
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/pio'
}
