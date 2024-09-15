import _ from 'lodash'
export const namespace = 'dataCollectasdModel'

export default () => ({
  namespace,
  state: {
    validForm: {},
    fieldsVal: {},
    activeKey: 'dataSetPane_0'
  },
  reducers: {
    changeState(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  },
  sagas: {}
})
