import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'
import digital7Font from 'file-loader!../../../images/digital-7-mono.ttf'

export default function getNumber(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      _extra: {
        option: {
          borderStyle: {
            borderWidth: 0,
            borderColor: '#fff',
            borderStyle: 'solid'
          },
          inputStyle: {
            backgroundColor: '#fff',
            color: '#000',
            width: 300,
            height: 100,
            fontSize: 40,
            fontWeight: 'normal',
            fontFamily: 'Microsoft Yahei',
            textAlign: 'left'
          }
        }
      }
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '输入框',
      name: 'inputBox',
      type: 'editorGroup',
      items: [
        new StyleItem(commonStyleItem.color, {
          value: _.get(styleConfig, '_extra.option.inputStyle.backgroundColor', '#fff'),
          onChange(v) {
            updateFn('_extra.option.inputStyle.backgroundColor', () => v)
          }
        }),
        new StyleItem({
          title: '宽度',
          name: 'width',
          type: 'number',
          min: 0,
          value: _.get(styleConfig, '_extra.option.inputStyle.width', 400),
          onChange(v) {
            updateFn('_extra.option.inputStyle.width', () => v)
          }
        }),
        new StyleItem({
          title: '高度',
          name: 'height',
          type: 'number',
          min: 0,
          value: _.get(styleConfig, '_extra.option.inputStyle.height', 20),
          onChange(v) {
            updateFn('_extra.option.inputStyle.height', () => v)
          }
        })
      ]
    }),
    new StyleItem({
      title: '边框',
      name: 'borderStyle',
      type: 'editorGroup',
      items: [
        new StyleItem(commonStyleItem.color, {
          value: _.get(styleConfig, '_extra.option.borderStyle.borderColor', '#fff'),
          onChange(v) {
            updateFn('_extra.option.borderStyle.borderColor', () => v)
          }
        }),
        new StyleItem({
          title: '边框宽度',
          name: 'borderWidth',
          type: 'number',
          min: 0,
          value: _.get(styleConfig, '_extra.option.borderStyle.borderWidth', 0),
          onChange(v) {
            updateFn('_extra.option.borderStyle.borderWidth', () => v)
          }
        }),
        new StyleItem({
          title: '边框圆角',
          name: 'borderRadius',
          type: 'number',
          min: 0,
          value: _.get(styleConfig, '_extra.option.borderStyle.borderRadius', 0),
          onChange(v) {
            updateFn('_extra.option.borderStyle.borderRadius', () => v)
          }
        })
      ]
    }),
    new StyleItem({
      title: '数值',
      name: 'inputNumberStyle',
      type: 'editorGroup',
      items: [
        new StyleItem(commonStyleItem.color, {
          value: _.get(styleConfig, '_extra.option.inputStyle.color', '#fff'),
          onChange(v) {
            updateFn('_extra.option.inputStyle.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontSize, {
          value: _.get(styleConfig, '_extra.option.inputStyle.fontSize', 32) + '',
          onChange(v) {
            updateFn('_extra.option.inputStyle.fontSize', () => parseInt(v))
          }
        }),
        new StyleItem(commonStyleItem.textAlign, {
          value: _.get(styleConfig, '_extra.option.inputStyle.textAlign', 'left'),
          onChange(v) {
            updateFn('_extra.option.inputStyle.textAlign', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontFamily, {
          value: _.get(styleConfig, '_extra.option.inputStyle.fontFamily', 'Microsoft Yahei'),
          onChange(v) {
            updateFn('_extra.option.inputStyle.fontFamily', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontWeight, {
          value: _.get(styleConfig, '_extra.option.inputStyle.fontWeight', 'normal'),
          onChange(e) {
            var checked = e.target.checked
            updateFn('_extra.option.inputStyle.fontWeight', () => checked ? 'bold' : 'normal')
          }
        })
      ]
    })
  ]
}
