/**
 * Created by asd on 17-7-21.
 */

import { NAMESPACE } from '../constants'

function creator (mark) {
  return `${NAMESPACE.CREATE}-loading-${mark}`
}

const Action = {
  change: creator('change')
}

/**
 * @typedef {Object} AccessToolsLoading
 * @property {Boolean} sync - 同步维度
 * @property {Boolean} project - 查询 project
 * @property {Boolean} accessDataTask - 查询 accessDataTask
 */
const Def = {
  sync: false,
  project: false,
  accessDataTask: false
}

/**
 * @param {AccessToolsLoading} state
 * @param {Object} action
 * @return {Object}
 */
function scheduler (state, action) {
  const { type, payload } = action

  switch (type) {
    case Action.change:
      return { ...payload }
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

