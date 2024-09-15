/*
 * @Author: xuxinjiang
 * @Date: 2020-06-19 15:19:00
 * @LastEditTime: 2020-06-29 09:58:54
 * @FilePath: \sugo-analytics\src\server\models\apis\console-pages\plantform.page.js
 */
export default [
  {
    path: '/data-quantity/data-dictionary/metadata-harvesting',
    title: '数据采集',
    class: '数据资产管理中心',
    group: '元数据',
    requirePermission: true,
    menusCate: ['数据资产管理中心', '元数据', '元数据采集', '数据采集']
  },
  {
    path: '/data-quantity/data-dictionary/task-monitoring',
    title: '任务监控',
    class: '数据资产管理中心',
    group: '元数据',
    requirePermission: true,
    menusCate: ['数据资产管理中心', '元数据', '元数据采集', '任务监控']
  },
  {
    path: '/data-quantity/data-dictionary/version-comparison',
    title: '元数据目录',
    class: '数据资产管理中心',
    group: '元数据',
    requirePermission: true,
    menusCate: ['数据资产管理中心', '元数据', '元数据管理', '元数据目录']
  },
  {
    path: '/data-quantity/data-dictionary/consanguinity-analysis/index',
    title: '血缘分析',
    class: '数据资产管理中心',
    group: '元数据',
    requirePermission: true,
    menusCate: ['数据资产管理中心', '元数据', '元数据应用', '血缘分析']
  },
  {
    path: '/data-quantity/data-dictionary/consanguinity-analysis/affect',
    title: '影响分析',
    class: '数据资产管理中心',
    group: '元数据',
    requirePermission: true,
    menusCate: ['数据资产管理中心', '元数据', '元数据应用', '影响分析']
  }
]
