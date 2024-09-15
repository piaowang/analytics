const Action = {
  loading: 'business-db-setting-load-loading',
  testing: 'business-db-setting-load-testing',
  saveing: 'business-db-setting-load-saveing'
}

/**
 * @typedef {Object} ProjectAccessorLoading
 * @property {Boolean} loading - 接入类型
 */
const Def = {
  loading: true,
  testing: false,
  saveing: false
}

/**
 * @param {ProjectAccessorLoading} state
 * @param {Object} action
 * @param {Function} done
 * @return {Object}
 */
function scheduler (state, action, done) {
  switch (action.type) {
    case Action.loading:
      return { ...state, ...action.payload }
    default:
      return state
  }
}

export default {
  name: 'Loading',
  scheduler,
  state: { ...Def }
}

export {
  Action
}
