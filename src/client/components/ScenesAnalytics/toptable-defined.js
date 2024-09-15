import _ from 'lodash'
import moment from 'moment'

const proCategory_DingCun = '定存'
export const generateDeviceCountSlices = (datasourceCurrent, type, [since, until]) => {
  if (_.isEmpty(datasourceCurrent)) {
    return null
  }
  let slice = {
    ScenesBrowse: {
      druid_datasource_id: datasourceCurrent.id,
      colTitle: [{
        description: '头像',
        title: 'img'
      }, {
        description: '累计至当前为止的累计总数，不随筛选时间改变而变化',
        title: '累计总数'
      }, {
        description: '筛选时间内首次使用app的用户数',
        title: '新增用户数'
      }, {
        description: '筛选时间内的访问数',
        title: '活跃数'
      }],
      rowTitle: [{
        title: '访问用户数',
        paramsData: ['访问用户数-累计总数', '访问用户数-新增用户数', '访问用户数-活跃数']
      }, {
        title: '登录用户数',
        paramsData: ['登录用户数-累计总数', '登录用户数-新增用户数', '登录用户数-活跃数']
      }],
      params: {
        'customMetrics': [{
          'name': '访问用户数-累计总数',
          'formula': '$main.filter($distinct_id.isnt("")).countDistinct($distinct_id, "sketch")'
        }, {
          'name': '访问用户数-新增用户数',
          'formula': `$main.filter($distinct_id.isnt("")).filter(${+moment(since)} <= $first_visit_time.cast('NUMBER') and $first_visit_time.cast('NUMBER') < ${+moment(until)}).countDistinct($distinct_id, "sketch")`
        }, {
          'name': '访问用户数-活跃数',
          'formula': `$main.filter($distinct_id.isnt("")).filter(${+moment(since)} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+moment(until)}).filter($system_name.in(["Android", "iOS", "iPhone OS"])).countDistinct($distinct_id, "sketch")`
        }, {
          'name': '登录用户数-累计总数',
          'formula': '$main.filter($cst_no.isnt("")).countDistinct($cst_no, "sketch")'
        }, {
          'name': '登录用户数-新增用户数',
          'formula': `$main.filter($cst_no.isnt("")).filter(${+moment(since)} <= $first_login_time.cast('NUMBER') and $first_login_time.cast('NUMBER') < ${+moment(until)}).countDistinct($cst_no, "sketch")`
        }, {
          'name': '登录用户数-活跃数',
          'formula': `$main.filter($cst_no.isnt("")).filter(${+moment(since)} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+moment(until)}).filter($system_name.in(["Android", "iOS", "iPhone OS"])).countDistinct($cst_no, "sketch")`
        }
        ],
        'filters': [{
          'col': '__time',
          'op': 'in',
          'eq': ['1000', '3000']
        }]
      }
    },
    financialBrowse: {
      druid_datasource_id: datasourceCurrent.id,
      colTitle: [{
        description: '头像',
        title: 'img'
      }, {
        description: '累计至上一小时为止的总金额，不随筛选时间改变而变化',
        title: '累计金额'
      }, {
        description: '筛选时间内的交易总笔数',
        title: '累计笔数'
      }, {
        description: '筛选时间内的交易人数',
        title: '累计人数'
      }],
      rowTitle: [{
        title: '理财产品(金荷花,幸福存)',
        paramsData: ['理财产品-累计金额', '理财产品-累计笔数', '理财产品-累计人数']
      }, {
        title: '定存',
        paramsData: ['定存-累计金额', '定存-累计笔数', '定存-累计人数']
      }],
      params: {
        'customMetrics': [ {
          'name': '理财产品-累计金额',
          'formula': `$main
          .filter($pro_tran_amt.isnt(""))
          .filter($pro_sts == "交易成功")
          .filter($pro_category == "金荷花" or $pro_category == "幸福存")
          .sum($pro_tran_amt)`
        }, {
          'name': '理财产品-累计笔数',
          'formula': `$main
          .filter(${+moment(since)} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+moment(until)})
          .filter($pro_tran_amt.isnt(null))
          .filter($pro_sts == "交易成功")
          .filter($pro_category == "金荷花" or $pro_category == "幸福存")
          .count()`
        }, {
          'name': '理财产品-累计人数',
          'formula': `$main
          .filter($pro_tran_amt.isnt(null))
          .filter(${+moment(since)} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+moment(until)})
          .filter($pro_sts == "交易成功")
          .filter($pro_category == "金荷花" or $pro_category == "幸福存")
          .countDistinct($cst_no, "sketch")`
        }, {
          'name': '定存-累计金额',
          'formula': `$main
          .filter($pro_tran_amt.isnt(null))
          .filter($pro_sts == "交易成功")
          .filter($pro_category == "${proCategory_DingCun}")
          .sum($pro_tran_amt)`
        }, {
          'name': '定存-累计笔数',
          'formula': `$main
          .filter($cst_no.isnt(("")))
          .filter(${+moment(since)} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+moment(until)})
          .filter($pro_tran_amt.isnt(null))
          .filter($pro_sts == "交易成功")
          .filter($pro_category == "${proCategory_DingCun}")
          .count()`
        }, {
          'name': '定存-累计人数',
          'formula': `$main
          .filter($pro_tran_amt.isnt(null))
          .filter(${+moment(since)} <= $__time.cast('NUMBER') and $__time.cast('NUMBER') < ${+moment(until)})
          .filter($pro_sts == "交易成功")
          .filter($pro_category == "${proCategory_DingCun}")
          .countDistinct($cst_no, "sketch")`
        }
        ],
        'filters': [{
          'col': '__time',
          'op': 'in',
          'eq': ['1000', '3000']
        }]
      }
    },
    loanBrowse: {
      druid_datasource_id: datasourceCurrent.id,
      colTitle: [{
        description: '头像',
        title: 'img'
      }, {
        description: '筛选时间内的预约件数',
        title: '预约申请件数'
      }, {
        description: '筛选时间内的预约人数',
        title: '申请人数'
      }, {
        description: '筛选时间内的申请成功人数',
        title: '申请成功的人数'
      }],
      rowTitle: [{
        title: '通过手机银行申请开通遂心贷',
        paramsData: ['遂心贷-预约申请件数', '遂心贷-申请人数', '遂心贷-申请成功的人数']
      }],
      params: {
        'customMetrics': [
          {
            'name': '遂心贷-预约申请件数',
            'formula': '$main.filter($cst_no.isnt("")).count()'
          },{
            'name': '遂心贷-申请人数',
            'formula': '$main.countDistinct($cst_no)'
          }],
        'filters': [{
          'col': '__time',
          'op': 'in',
          'eq': [since, until]
        },{
          'col': 'event_name',
          'op': 'in',
          'eq': ['预约成功']
        },{
          'col': 'page_name',
          'op': 'in',
          'eq': ['遂心贷']
        },{
          'col': 'system_name',
          'op': 'in',
          'eq': ['Android', 'iOS', 'iPhone OS']
        }]
      }
    }
  }
  const targetSlice = _.get(slice, type, {})
  return targetSlice
}
