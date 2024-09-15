import _ from 'lodash'
import deepCopy from '../../../../common/deep-copy'
import { immutateUpdate, remove } from '../../../../common/sugo-utils'
const namespace = 'livescreen'

const livescreenState = {
  loading: false,
  list: [],
  groupModalInfo: {}
}

const reducers = {
  set_loading: (state, { loading }) => {
    return {
      ...state,
      loading
    }
  },
  getLiveScreens: (state, { list = [] }) => {
    return {
      ...state,
      list
    }
  },
  addLiveScreenTheme: (state, { data }) => {
    let { list } = state
    list = deepCopy(list)
    list.unshift(data)
    return {
      ...state,
      list
    }
  },
  addLiveScreen: (state, { data }) => {
    let { list } = state
    list = deepCopy(list)
    list.unshift(data)
    return {
      ...state,
      list
    }
  },
  updateLiveScreen: (state, { livescreen }) => {
    let { list } = state
    const { id } = livescreen
    const index = _.findIndex(list, v => v.id === id)
    if (index > -1) {
      return {
        ...state,
        list : immutateUpdate(list, index, o => Object.assign({}, o, livescreen))
      }
    }
    return state
  },
  deleteLiveScreen: (state, { id }) => {
    const { list } = state
    const newList = _.filter(list, v => !id.split(',').includes(v.id))
    if (newList.length) {
      return {
        ...state,
        list: newList
      }
    }
    return state
  },
  getGroupInfo: (state, {result } ) => {
    return {...state, groupModalInfo: result }
  },
  moveGroup: (state, {id, category_id}) => {
    const {list } = state
    const newList = list.map(o => {
      if(o.id === id) {
        return {...o, category_id }
      }
      return o
    })
    return {...state, list: newList}
  }
}

export default (state = _.clone(livescreenState), action) => {
  const { type, ...rest } = action
  if (!_.includes(type, namespace)) {
    return state
  }
  const shortType = type.replace(`${namespace}_`, '')
  const reduceFn = reducers[shortType]
  if (typeof reduceFn === 'function')  {
    return reduceFn(state, rest)
  } else {
    if (type.substr(0, namespace.length) === namespace) {
      // console.warn(`不存在对应的reducer: ${type}`)
    }
  }
  return state
}



