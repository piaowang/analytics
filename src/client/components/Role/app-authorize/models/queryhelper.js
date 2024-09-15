import Fetch from '../../../../common/fetch-final'

export async function getAllApplication(query) {
  const res = await Fetch.get('/api/portal-apps')
  if (!res.success) return []
  return res && res.result
}

export async function getAllApptag(query) {
  const res = await Fetch.get('/app/portal-tags')
  return res && res.result
}
