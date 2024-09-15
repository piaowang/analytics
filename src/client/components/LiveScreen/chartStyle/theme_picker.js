import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'

export default function getThemePicker(styleConfig, updateFn) {
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
      rotate: 0,
      iconType: 'antd',
      iconSrc: 'skin',
      textContent: '主题切换'
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
        new StyleItem({
          title: '图标类型',
          name: 'iconType',
          type: 'select',
          options: [
            { key: 'antd', value: 'antd 图标' },
            { key: 'dataUrl', value: '自定义小图标' }
          ],
          value: _.get(styleConfig, 'iconType', 'antd'),
          onChange(v){
            updateFn('iconType', () => v)
          }
        }),
        _.get(styleConfig, 'iconType', 'antd') === 'antd' ? (
          new StyleItem({
            title: '图标名称',
            name: 'iconSrc',
            type: 'input',
            value: _.get(styleConfig, 'iconSrc', 'skin'),
            onChange(ev){
              let {value} = ev.target
              updateFn('iconSrc', () => value)
            }
          })
        ) : (
          new StyleItem({
            title: '上传小图标',
            name: 'iconSrc',
            type: 'fileToDataUrl',
            value: _.get(styleConfig, 'iconSrc') + '',
            onChange(v){
              updateFn('iconSrc', () => v)
            }
          })
        ),
        new StyleItem({
          title: '文本内容',
          name: 'textContent',
          type: 'input',
          value: _.get(styleConfig, 'textContent', '主题切换'),
          onChange(ev){
            let {value} = ev.target
            updateFn('textContent', () => value)
          }
        }),
        new StyleItem({
          title: '旋转（角度）',
          name: 'rotate',
          type: 'number',
          value: _.get(styleConfig, 'rotate', 0) + '',
          onChange(v){
            updateFn('rotate', () => +v)
          }
        }),
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
          title: '行高（em）',
          name: 'lingHeight',
          type: 'number',
          value: _.get(styleConfig, 'lineHeight', 1.5),
          onChange(v){
            updateFn('lineHeight', () => v)
          }
        })
      ]
    })
  ]
}
