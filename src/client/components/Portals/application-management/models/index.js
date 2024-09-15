import {getAllApplication} from '../store/queryhelper'

export const APP_MGR_SAGA_MODEL_NS = 'application-management'

const appMgrSagaModel = {
  namespace: APP_MGR_SAGA_MODEL_NS,
  state: {
    selectedTag: '',
    editingOrderAppMap: {},
    modalState: false,
    application: [],
    checkedTag: [],
    rightContentView: '',
    applicationVal: '',
    checkList: []
  },
  reducers: {
    change(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    },
    changeEditingOrderAppMap(state, { payload }) {
      return {
        ...state,
        editingOrderAppMap: {
          ...state.editingOrderAppMap,
          ...payload
        }
      }
    }
  },
  sagas: {
    *initApplications({  }, { call, put, select }) {
      let result = yield call(getAllApplication)
      let appPermissions = window?.sugo?.user?.appsPermissions
      if (appPermissions[0] !== 'all') {
        result = result.filter( i => appPermissions.includes(i.id))
      }

      yield put({
        type: 'change',
        payload: {
          application: result
        }
      })
    }
  },
  subscriptions: {
    init({ dispatch, history }) {
      dispatch({ type: 'initApplications', payload: {  } })
    }
  }
}
export default appMgrSagaModel
