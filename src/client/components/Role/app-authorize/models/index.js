export default {
  namespace: 'appAuthorizeApplication',
  state: {
    currentPage: 0,
    pageSize: 10,
    checkedApp: [],
    selectedTag: [],
    tagSearchVal: '',
    appNameSearchVal: ''
  },
  reducers: {
    changeState(state, { payload }) {
      // Save data to state
      return {
        ...state,
        ...payload
      }
    }
  },
  effects: {
  },
  subscriptions: {
    // init({ dispatch }) {
    // }
  }
}
