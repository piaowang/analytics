import _ from 'lodash'

export default function genStyleItems(styleConfig, updateFn) {
  if(_.isEmpty(styleConfig)) {
    const defaultStyle = {
      _reactKey: 0
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
  ]
}
