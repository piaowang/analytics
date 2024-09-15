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
            borderColor: '#00bde1',
            borderStyle: 'solid'
          },
          titleStyle: {
            color: '#fff',
            fontSize: 32,
            fontFamily: 'Microsoft Yahei'
          },
          numberStyle: {
            color: '#fff',
            fontSize: 32,
            fontFamily: 'Microsoft Yahei',
            timer: 5
          },
          fixStyle: {
            color: '#FFF'
          }
        }
      }
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
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
        })
      ]
    }),
    new StyleItem({
      title: '布局设置',
      name: 'layoutSetting',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '布局样式',
          name: 'align',
          type: 'select',
          options: [{ key: 'default', value: '布局1' }, { key: 'titleTop', value: '布局2' }, { key: 'hideTitle', value: '布局3' }, { key: 'scroll', value: '布局4(数字滚动)' }],
          value: _.get(styleConfig, '_extra.option.layoutSetting', 'default'),
          onChange(v) {
            updateFn('_extra.option.layoutSetting', () => v)
          }
        })
      ]
    }),
    new StyleItem({
      title: '标题',
      name: 'titleStyle',
      type: 'editorGroup',
      hidable: true,
      checked: _.get(styleConfig, '_extra.option.titleStyle.display', 'block') === 'block',
      onChangeVisible: function (e) {
        e.stopPropagation()
        const checked = e.target.checked
        updateFn('_extra.option.titleStyle.display', () => checked ? 'block' : 'none')
      },
      items: [
        new StyleItem(commonStyleItem.color, {
          value: _.get(styleConfig, '_extra.option.titleStyle.color', '#fff'),
          onChange(v) {
            updateFn('_extra.option.titleStyle.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.textAlign, {
          value: _.get(styleConfig, '_extra.option.titleStyle.textAlign', 'center'),
          onChange(v) {
            updateFn('_extra.option.titleStyle.textAlign', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontSize, {
          value: _.get(styleConfig, '_extra.option.titleStyle.fontSize', 18) + '',
          onChange(v) {
            updateFn('_extra.option.titleStyle.fontSize', () => parseInt(v))
          }
        }),
        new StyleItem(commonStyleItem.fontFamily, {
          value: _.get(styleConfig, '_extra.option.titleStyle.fontFamily', 'Microsoft Yahei'),
          onChange(v) {
            updateFn('_extra.option.titleStyle.fontFamily', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontWeight, {
          value: _.get(styleConfig, '_extra.option.titleStyle.fontWeight', 'normal'),
          onChange(e) {
            var checked = e.target.checked
            updateFn('_extra.option.titleStyle.fontWeight', () => checked ? 'bold' : 'normal')
          }
        })
      ]
    }),
    new StyleItem({
      title: '数值',
      name: 'numberStyle',
      type: 'editorGroup',
      items: [
        new StyleItem(commonStyleItem.color, {
          value: _.get(styleConfig, '_extra.option.numberStyle.color', '#fff'),
          onChange(v) {
            updateFn('_extra.option.numberStyle.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontSize, {
          value: _.get(styleConfig, '_extra.option.numberStyle.fontSize', 32) + '',
          onChange(v) {
            updateFn('_extra.option.numberStyle.fontSize', () => parseInt(v))
          }
        }),
        new StyleItem(commonStyleItem.textAlign, {
          value: _.get(styleConfig, '_extra.option.numberStyle.textAlign', 'center'),
          onChange(v) {
            updateFn('_extra.option.numberStyle.textAlign', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontFamily, {
          value: _.get(styleConfig, '_extra.option.numberStyle.fontFamily', 'Microsoft Yahei'),
          onChange(v) {
            updateFn('_extra.option.numberStyle.fontFamily', () => v)
          }
        }),
        new StyleItem({
          title: '前缀',
          name: 'txtPrefix',
          type: 'input',
          value: _.get(styleConfig, '_extra.option.prefix', ''),
          onChange(e) {
            updateFn('_extra.option.prefix', () => e.target.value)
          }
        }),
        new StyleItem({
          title: '后缀',
          name: 'txtSuffix',
          type: 'input',
          value: _.get(styleConfig, '_extra.option.suffix', ''),
          onChange(e) {
            updateFn('_extra.option.suffix', () => e.target.value)
          }
        }),
        new StyleItem(commonStyleItem.fontSize, {
          name: 'prefixAndSuffixFontSize',
          title:'前后缀文字大小',
          value: _.get(styleConfig, '_extra.option.fixStyle.fontSize', 32) + '',
          onChange(v) {
            updateFn('_extra.option.fixStyle.fontSize', () => parseInt(v))
          }
        }),
        new StyleItem(commonStyleItem.color, {
          name: 'prefixAndSuffixFontColor',
          title:'前后缀颜色',
          value: _.get(styleConfig, '_extra.option.fixStyle.color', '#FFF'),
          onChange(v) {
            updateFn('_extra.option.fixStyle.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontWeight, {
          value: _.get(styleConfig, '_extra.option.numberStyle.fontWeight', 'normal'),
          onChange(e) {
            var checked = e.target.checked
            updateFn('_extra.option.numberStyle.fontWeight', () => checked ? 'bold' : 'normal')
          }
        }),
        new StyleItem({
          name: 'scroll',
          type: 'number',
          title: '滚动时间（滚动布局下生效）',
          value: _.get(styleConfig, '_extra.option.numberStyle.timer', 5),
          onChange(v) {
            updateFn('_extra.option.numberStyle.timer', () => v)
          }
        })
      ]
    })
  ]
}
