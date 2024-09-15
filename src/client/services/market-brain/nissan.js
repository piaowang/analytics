import Fetch from 'client/common/fetch-final'
import _ from 'lodash'

export function getUserListByExecutionId(id) {
  return Fetch.get(`/app/nissan-market-execution/userlist/${id}`)
}

export function getCustomerListAll(userid) {
  return Fetch.get(`/app/nissan-market-execution/customerlist/${userid}`, {})
}

export function getStaffById(userid) {
  return Fetch.get(`/app/nissan-market-execution/get-staff-by-id/${userid}`, {})
}