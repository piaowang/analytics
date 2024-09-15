/**
 * Created by heganjie on 2016/11/15.
 */

import ReactDOM from 'react-dom'
import showPopover from './free-popover'
import { CloseCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import _ from 'lodash'

export default function hintOnce(reactComponent, key, text) {
  let isAlredyHint = localStorage.getItem(key)
  if (isAlredyHint) {
    return null
  }
  let cleanUp
  let content = (
    <div className="font14">
      <QuestionCircleOutlined className="color-blue mg1r width20" />
      <div className="itblock color-blue">{text}</div>
      <CloseCircleOutlined
        className="pointer width40"
        onClick={() => {
          cleanUp()
          localStorage.setItem(key, true)
        }} />
    </div>
  )
  cleanUp = showPopover(ReactDOM.findDOMNode(reactComponent), content,
    { onVisibleChange: _.identity }, { border: '1px dashed #08c' })

  return cleanUp
}
