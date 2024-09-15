/**
 * @author xuxinjiang
 * @date  2020-05-12
 * @description 数据资产管理中心/指标管理的子应用
 */

export default [
  {
    path: '/indices-dev/workflow',
    title: '访问指标申请',
    class: '指标申请',
    group: '指标申请',
    requirePermission: true,
    menusCate: ['数据资产管理中心','指标管理','指标申请']
  },
  {
    path: '/indices-dev/data-sources',
    title: '指标数据源管理',
    class: '指标开发',
    group: '指标开发',
    requirePermission: true,
    menusCate: ['数据资产管理中心','指标管理','指标开发']
  },
  {
    path: '/indices-dev/indices',
    title: '指标管理',
    class: '指标开发',
    group: '指标开发',
    requirePermission: true,
    menusCate: ['数据资产管理中心','指标管理','指标管理']
  },
  {
    path: '/indices-dev/dimensions',
    title: '维度管理',
    class: '指标开发',
    group: '指标开发',
    requirePermission: true,
    menusCate: ['数据资产管理中心','指标管理','指标开发']
  },
  {
    path: '/indices-dev/index-models',
    title: '模型管理',
    class: '指标开发',
    group: '指标开发',
    requirePermission: true,
    menusCate: ['数据资产管理中心','指标管理','指标开发']
  },
  {
    path: '/indices-dev/approve-setting',
    title: '审批流程配置',
    class: '系统管理',
    group: '系统管理',
    requirePermission: true,
    menusCate: ['数据资产管理中心','指标管理','系统管理']
  }

]
