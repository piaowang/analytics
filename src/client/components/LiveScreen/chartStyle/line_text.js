import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'

export default function getNumber(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      display: 'inline-block',
      verticalAlign: 'middle',
      width: '100%',
      color: '#fcc04e',
      fontSize: 32,
      fontFamily: 'Microsoft Yahei',
      textAlign: 'center',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      lineHeight: 1.5,
      overflow: 'hidden',
      css1:{
        showColor: false,
        borderColor:'white',
        borderWidth: 3,
        borderStyle: 'solid',
        borderRadius: 30
      }
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '文本',
      name: 'line_text',
      type: 'editorGroup',
      items: [
        new StyleItem(commonStyleItem.color, {
          value: _.get(styleConfig, 'color', '#fff'),
          onChange(v){
            updateFn('color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.textAlign, {
          value: _.get(styleConfig, 'textAlign', 'center'),
          onChange(v){
            updateFn('textAlign', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontSize, {
          value: _.get(styleConfig, 'fontSize', 32) + '',
          onChange(v){
            updateFn('fontSize', () => parseInt(v))
          }
        }),
        new StyleItem(commonStyleItem.fontFamily, {
          value: _.get(styleConfig, 'fontFamily', 'Microsoft Yahei'),
          onChange(v){
            updateFn('fontFamily', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontWeight, {
          checked: _.get(styleConfig, 'fontWeight', 'normal') === 'bold',
          onChange(e){
            var checked = e.target.checked
            updateFn('fontWeight', () => checked ? 'bold' : 'normal')
          }
        }),
        new StyleItem({
          title: '允许多行',
          name: 'multiLine',
          type: 'checkbox',
          checked: !_.get(styleConfig, 'whiteSpace'),
          onChange(e){
            var checked = e.target.checked
            updateFn('whiteSpace', () => checked ? null : 'nowrap')
          }
        }),
        new StyleItem({
          title: '行高（em）',
          name: 'lingHeight',
          type: 'number',
          value: _.get(styleConfig, 'lineHeight', 1.5),
          onChange(v){
            updateFn('lineHeight', () => v)
          }
        })
      ]
    }),
    new StyleItem({
      title: '边框',
      name: 'line_text',
      type: 'editorGroup',
      items: [
        new StyleItem({
          type: 'checkbox',
          name: 'showColor',
          title: '是否启用',
          checked: _.get(styleConfig, 'css1.showColor', false),
          onChange(e){
            var checked = e.target.checked
            updateFn('css1.showColor', () => checked)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '边框颜色',
          value: _.get(styleConfig, 'css1.borderColor', '#fff'),
          onChange(v){
            updateFn('css1.borderColor', () => v)
          }
        }),
        new StyleItem({
          title: '边框大小(px)',
          type:'number',
          name: 'borderWidth',
          min:0,
          value: _.get(styleConfig, 'css1.borderWidth', 0),
          onChange(v){
            updateFn('css1.borderWidth', () => v)
          }
        }),
        new StyleItem(commonStyleItem.lineStyle, {
          title: '边框类型',
          name: 'borderStyle',
          value: _.get(styleConfig, 'css1.borderStyle', 'solid'),
          onChange(v){
            updateFn('css1.borderStyle', () => v  )
          }
        }),
        new StyleItem({
          title: '边框圆角(px)',
          name: 'borderRadius',
          type: 'number',
          min:0,
          value: _.get(styleConfig, 'css1.borderRadius', 0),
          onChange(v){
            updateFn('css1.borderRadius', () => v)
          }
        })
      ]
    })
  ]
}
