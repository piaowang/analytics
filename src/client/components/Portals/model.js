/**
 * @aut xuxinjiang
 * @description 全局state
 */

export default {
  namespace:'portalSage',
  state: {
    formData:{}
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
