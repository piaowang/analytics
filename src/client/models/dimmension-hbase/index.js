
import Action from './action'
import Resource from './resource'

/** @type {DimensionsHBaseModel} */
const Def = {
  id: '',
  name: '',
  type: -1,
  analysis_id: '',
  updated_by: '',
  created_by: '',
  updated_at: '',
  created_at: ''
}

/**
 * @param {DimensionsHBaseModel} state
 * @param {object} action
 * @param {function} done
 * @return {*}
 */
function scheduler (state, action, done) {
  switch (action.type) {
    default:
      return state
  }
}

export default {
  name: 'DimensionsHBase',
  state: { ...Def },
  scheduler
}

export {
  Action,
  Resource,
  Def
}
