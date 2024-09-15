/**
 * @date  2019-04-16 19:17:55
 * @description 全局state
 */
export const namespace = 'sagaCommon'

export default {
  namespace,
  state: {
    projectCurrent: {},
    datasourceCurrent: {},
    projectList: [],
    datasourceList: [],
    taskFullscreen: false //工作流组全屏属性
  },
  reducers: {
    changeState(state, { payload }) {
      return {
        ...state,
        ...payload
      }
    }
  }
}
