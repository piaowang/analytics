import Fetch from 'client/common/fetch-final'

export function fetchResult(id) {
  return Fetch.get('/app/market-brain-acts/result/fetchOneById', {id})
}
