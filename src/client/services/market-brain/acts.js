import Fetch from 'client/common/fetch-final'

export async function get(payload = {}) {
  return await Fetch.get('/app/market-brain-actives/list', payload)
}

export async function update(payload = {}) {
  return await Fetch.post('/app/market-brain-actives/update', payload)
}

export async function getResult(payload = {}) {
  return await Fetch.get('/app/market-brain-actives/get-result', payload)
}

export async function getLine(payload = {}) {
  return await Fetch.get('/app/market-brain-actives/get-line', payload)
}

export function getUserGroups(params = {}) {
  return Fetch.get('/app/usergroup/get', { where: params })
}

export function getOne(id) {
  return Fetch.get('/app/market-brain-actives/list-one', { id })
}
