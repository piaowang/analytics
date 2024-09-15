const ctrl = 'controllers/pio-projects.controller'

const base = {
  requireLogin: true,
  requirePermission: false,
  lib: ctrl,
  method: 'get',
  class: '智能分析',
  group: '智能分析',
  menusCate: ['产品实验室','智能分析', '智能分析']

}

const routes = [
  {
    path: '/get',
    title: 'get proj',
    func: 'get'
  }, {
    path: '/add',
    title: '创建智能分析',
    method: 'post',
    func: 'add',
    requirePermission: true
  }, {
    path: '/update',
    title: '更新智能分析',
    method: 'post',
    func: 'update',
    requirePermission: true
  }, {
    path: '/del/:id',
    title: '删除智能分析',
    method: 'delete',
    func: 'del',
    requirePermission: true
  }, {
    path: '/add-process-operator',
    title: 'addProcessOperator',
    method: 'post',
    func: 'addProcessOperator'
  }, {
    path: '/del-process-operator/:processId/:operatorName',
    title: 'delProcessOperator',
    method: 'delete',
    func: 'delProcessOperator'
  }, {
    path: '/update-process-operator',
    title: 'updateProcessOperator',
    method: 'post',
    func: 'updateProcessOperator'
  }, {
    path: '/update-operator-info',
    title: 'updateProcessOperator',
    method: 'post',
    func: 'updateOperatorInfo'
  }, {
    path: '/connect',
    title: 'connect',
    method: 'post',
    func: 'connect'
  }, {
    path: '/disconnect',
    title: 'disconnect',
    method: 'post',
    func: 'disConnect'
  }, {
    path: '/run',
    title: 'run',
    method: 'post',
    func: 'run'
  }, {
    path: '/operator-result',
    title: 'operator-result',
    method: 'post',
    func: 'getOperatorResult'
  }, {
    path: '/upload-process-operator-data',
    title: 'uploadProcessOperatorData',
    method: 'post',
    func: 'uploadProcessOperatorData'
  }, {
    path: '/add-template',
    title: '创建模版',
    method: 'post',
    func: 'addTemplate',
    requirePermission: true
  }, {
    path: '/get-template-type',
    title: 'get template',
    method: 'get',
    func: 'getTemplateType'
  }, {
    path: '/add-case',
    title: '创建案例',
    method: 'post',
    func: 'createCase',
    requirePermission: true
  }, {
    path: '/get-case',
    title: 'get case',
    method: 'get',
    func: 'getCase'
  }, {
    path: '/clone-case',
    title: '从案例创建',
    method: 'post',
    func: 'cloneCase',
    requirePermission: true
  }, {
    path: '/run-to',
    title: 'run to',
    method: 'post',
    func: 'runTo'
  }, {
    path: '/run-from',
    title: 'run from',
    method: 'post',
    func: 'runFrom'
  }, {
    path: '/clone-operator',
    title: 'clone operator',
    method: 'post',
    func: 'cloneOperator'
  }, {
    path: '/get-log',
    title: 'get log',
    method: 'get',
    func: 'logOperator'
  }, {
    path: '/run-single',
    title: 'run single',
    method: 'post',
    func: 'runSingle'
  }
]

export default {
  routes : routes.map(r => ({
    ...base,
    ...r
  })),
  prefix : 'app/proj'
}
