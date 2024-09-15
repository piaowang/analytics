import Fetch from 'client/common/fetch-final'

export function getPushLandList(params = {}) {
  return Fetch.get('/app/market-brain-pushlandpage/list', params )
}

export function create(params = {}) {
  return Fetch.post('/app/market-brain-pushlandpage/create', params)
}

export function getAllPushLandPage() {
  return Fetch.get('/app/market-brain-pushlandpage/list-all' )
}

export async function getAllCopyWriting(payload) {
  return await Fetch.get('/app/market-brain-copywriting/list', payload )
}
