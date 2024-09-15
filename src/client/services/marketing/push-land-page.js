import Fetch from 'client/common/fetch-final'

export function getPushLandList(params = {}) {
  return Fetch.get('/app/marketing-pushlandpage/list', params )
}

export function create(params = {}) {
  return Fetch.post('/app/marketing-pushlandpage/create', params)
}

export function getAllPushLandPage() {
  return Fetch.get('/app/marketing-pushlandpage/list-all' )
}
