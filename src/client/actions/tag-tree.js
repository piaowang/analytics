import Fetch from '../common/fetch-final'
import {setLoading} from './common'

const getTagTrees = (datasourceId, query = {}, doDispatch = true) => {
  return async dispatch => {
    setLoading(dispatch, true)
    let res = await Fetch.get('/app/tag-type-tree/list/' + datasourceId, query)
    setLoading(dispatch, false)
    if (res && doDispatch) {
      let action1 = {
        type: 'set_tagTrees',
        data: res.result.trees
      }
      dispatch(action1)
    }
    return res
  }
}

export {
  getTagTrees
}
