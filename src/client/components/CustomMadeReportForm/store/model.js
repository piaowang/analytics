import Fetch from '../../../common/fetch-final'

export const namespace = 'customMadeReportForm'

export default {
  namespace,
  state: {
    datasourceList: [],
    datasource_id: '',
    sdk_type: '',
    app_version: ''
  },
  reducers: {
    createDatasourceList(state, { payload }) {
   
      return {
        datasourceList: payload
      }
    }
  },
  sagas: {
    *createDatasourceListAsync(action, effects) {
      const res = yield effects.call(Fetch.get, '/app/project/list')
      // yield effects.put({
      //   type: 'createDatasourceList',
      //   payload: res.result.model
      // })
    }
  }
}
