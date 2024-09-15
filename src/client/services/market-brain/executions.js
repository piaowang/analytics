import Fetch from 'client/common/fetch-final'
import _ from 'lodash'

export function getExecutionsByMaxDate(staff_id) {
  return Fetch.get('/app/market-brain-task/get-maxdate-executions', { staff_id })
}

export function getCustomerByExecutionId(id) {
  return Fetch.get(`/app/market-brain-execution/list/${id}`)
}

export function claimExecution(id, staff_id, isGenAct = false) {
  return Fetch.post(`/app/market-brain-execution/claim-execution/${id}`, {
    staff_id,
    isGenAct
  })
}

export function claimCustomer(id, staff_id) {
  return Fetch.put(`/app/market-brain-execution/claim-customer/${id}`, {
    staff_id
  })
}

export function getDetailList(id, staff_id) {
  if (!id) return Fetch.get('/app/market-brain-execution/detail-list', {
    staff_id
  })
  return Fetch.get(`/app/market-brain-execution/detail-list/${id}`, {
    staff_id
  })
}

export function confirmContactUser(id) {
  return Fetch.put(`/app/market-brain-execution/confirm-contact-user/${id}`)
}

export function fetchDesensitizeMobile(ug) {
  //该接口由扩展包实现
  //约定结果结构 { result: ug }: { result: [{}] }
  return Fetch.post('/market-brain-fetch-desensitize-mobile', { ug })
}
