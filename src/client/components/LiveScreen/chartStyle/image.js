import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import { immutateUpdate, remove } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default function genStyleItems(styleConfig, updateFn) {
  if(_.isEmpty(styleConfig)) {
    const defaultStyle = {
      floatingWindow: ''
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '基础设置',
      name: 'imageSetting',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '浮窗内容',
          name: 'floatingWindow',
          type: 'number',
          value: _.get(styleConfig, 'floatingWindow', ''),
          onChange(v) {
            updateFn('floatingWindow', () => v)
          }
        })
      ]
    })
  ]
}
