/**
 * @Author sugo.io<asd>
 * @Date 17-9-26
 */

import Actions from './actions'
import Resource from './resources'

/**
 * @param {string} mark
 * @return {string}
 */
function creator (mark) {
  return `model-segment-${mark}`
}

const Action = {
  query: creator('query'),
  change: creator('change')
}

/**
 * @type {SegmentModel}
 */
const Def = {
  id: '',
  created_by: '',
  updated_by: '',
  title: '',
  druid_datasource_id: '',
  datasource_name: '',
  params: {},
  description: '',
  company_id: ''
}

/**
 *
 * @param {SegmentModel} state
 * @param {Object} action
 * @param {Function} done
 * @return {*}
 */

function scheduler (state, action, done) {
  const { type, payload } = action

  switch (type) {
    case Action.query:
      Actions.info(payload.id, done)
      break

    case Action.change:
      return { ...payload }
  }

  return state
}

export default {
  name: 'Segment',
  state: { ...Def },
  scheduler
}

export {
  Action,
  Resource,
  Def
}
