
const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/sugo-examine-config.controller',
  class: '审核流配置',
  group: '审核流配置'
}

const routes = [
  {
    method: 'get',
    path: '/app/examine-config/getExamines',
    title: '获取审核流列表数据',
    func: 'getExamines'
  }, {
    method: 'get',
    path: '/app/examine-config/getInstitutions',
    title: '获取机构列表',
    func: 'getInstitutions'
  }, {
    method: 'get',
    path: '/app/examine-config/getMembersByInstitutionsId',
    title: '根据机构id获取角色列表',
    func: 'getMembersByInstitutionsId'
  }, {
    method: 'post',
    path: '/app/examine-config/saveExamineConfig',
    title: '保存审核流程配置',
    func: 'saveExamineConfig'
  },  {
    method: 'get',
    path: '/app/examine-config/getExamineConfigByExamineId',
    title: '根据审核流id获取审核流配置信息',
    func: 'getExamineConfigByExamineId'
  }, {
    method: 'get',
    path: '/app/examine-config/deleteExamineConfig',
    title: '根据审核流id删除审核流',
    func: 'deleteExamineConfig'
  }

  
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: ''
}
