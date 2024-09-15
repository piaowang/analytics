import Fetch from 'client/common/fetch-final'

export async function get(payload = {}) {
  return await Fetch.get('/app/marketing-actives/list', payload)
}

export async function update(payload = {}) {
  return await Fetch.post('/app/marketing-actives/update', payload)
}

export async function getResult(payload = {}) {
  return await Fetch.get('/app/marketing-actives/get-result', payload)
}

export async function getLine(payload = {}) {
  return await Fetch.get('/app/marketing-actives/get-line', payload)
}

export function getUserGroups(params = {}) {
  return Fetch.get('/app/usergroup/get', { where: params })
}

export function getActGroups(params = {}) {
  return Fetch.get('/app/marketing-act-groups/list-all', params)
}

export function getOne(id) {
  return Fetch.get('/app/marketing-actives/list-one', { id })
}
