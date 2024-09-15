/**
 * @Author sugo.io<asd>
 * @Date 17-10-18
 */

/**
 * @typedef {Object} TagUserListLoading
 * @property {boolean} content     - 目前只有右侧面板需要长时间加载数据，所以用一个loading标识符即可
 */

/** @type {TagUserListLoading} */
const Def = {
  content: false
}

const Action = {
  content: 'tag-user-list-loading-content',
  clean: 'tag-user-list-loading-clean'
}

/**
 * @param {TagUserListStoreState} state
 * @param {{type:string,payload:*}} action
 * @param {Function} done
 */
function scheduler (state, action, done) {
  const { type, payload } = action

  switch (type) {
    case Action.content:
      done({ content: payload })
      break
    case Action.clean:
      done({ ...Def })
      break
    default:
      done({
        ...Def,
        ...state
      })
  }
}

export default {
  name: 'Loading',
  state: { ...Def },
  scheduler
}

export {
  Action
}
