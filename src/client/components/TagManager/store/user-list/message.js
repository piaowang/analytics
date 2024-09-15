/**
 * @Author sugo.io<asd>
 * @Date 17-9-29
 */

function creator (mark) {
  return `message-tag-user-list-${mark}`
}

const Action = {
  change: creator('change'),
  clean: creator('clean')
}

/**
 * @typedef {Object} TagUserListMsgState
 * @property {?string} error    - 错误类型消息
 * @property {?string} warning  - 警告类型消息
 * @property {?string} info     - 描述类型消息
 * @property {?number} duration - 消息呈现时长
 */

const Def = {
  error: null,
  warning: null,
  info: null,
  duration: undefined
}

/**
 * TODO ## 注意：该message每接收到新的action，只要与Action不匹配，则会主动清空所有的message
 * @param {TagUserListMsgState} state
 * @param {Object} action
 * @param {Function} done
 * @this {ViewModel}
 */
function scheduler (state, action, done) {
  const { type, payload } = action

  switch (type) {
    case Action.change:
      done(payload)
      break

    case Action.clean:
      done({ ...Def })
      break

    default:
      done({ ...Def })
  }
}

export default {
  name: 'Msg',
  state: { ...Def },
  scheduler
}

export {
  Action
}
