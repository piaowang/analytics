import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'
import digital7Font from 'file-loader!../../../images/digital-7-mono.ttf'

export default function getNumberLift(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      iconsUrl:[],
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
            fontFamily: 'Microsoft Yahei'
          },
          fixStyle: {
            color: '#FFF'
          },
          setData: {
            isPercent: false,
            toFixed: 2
          },
          pictureStyle:{
            size: 32,
            right: 18,
            top: 18,
            height: 32
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
          options: [{ key: 'default', value: '布局1' }, { key: 'titleTop', value: '布局2' }, { key: 'hideTitle', value: '布局3' }],
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
          name: 'titleColor',
          value: _.get(styleConfig, '_extra.option.titleStyle.color', '#fff'),
          onChange(v) {
            updateFn('_extra.option.titleStyle.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.textAlign, {
          name: 'titleTextAlign',
          value: _.get(styleConfig, '_extra.option.titleStyle.textAlign', 'center'),
          onChange(v) {
            updateFn('_extra.option.titleStyle.textAlign', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontSize, {
          name: 'titleFontSize',
          value: _.get(styleConfig, '_extra.option.titleStyle.fontSize', 18) + '',
          onChange(v) {
            updateFn('_extra.option.titleStyle.fontSize', () => parseInt(v))
          }
        }),
        new StyleItem(commonStyleItem.fontFamily, {
          name: 'titleFontFamily',
          value: _.get(styleConfig, '_extra.option.titleStyle.fontFamily', 'Microsoft Yahei'),
          onChange(v) {
            updateFn('_extra.option.titleStyle.fontFamily', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontWeight, {
          name: 'titleFontWeight',
          value: _.get(styleConfig, '_extra.option.titleStyle.fontWeight', 'normal'),
          onChange(e) {
            var checked = e.target.checked
            updateFn('_extra.option.titleStyle.fontWeight', () => checked ? 'bold' : 'normal')
          }
        })
      ]
    }),
    new StyleItem({
      title: '告警相关设置',
      name: 'warningStyle',
      type: 'editorGroup',
      items: [
        commonStyleItem.getIcons(styleConfig, updateFn),
        new StyleItem({
          title: '图片宽度',
          type: 'number',
          name: 'pictureSize',
          value: _.get(styleConfig, '_extra.option.pictureStyle.size', 32),
          onChange(v) {
            updateFn('_extra.option.pictureStyle.size', () => v)
          }
        }),
        new StyleItem({
          title: '图片高度',
          type: 'number',
          name: 'pictureHeight',
          value: _.get(styleConfig, '_extra.option.pictureStyle.height', 32),
          onChange(v) {
            updateFn('_extra.option.pictureStyle.height', () => v)
          }
        }),
        new StyleItem({
          title: '水平位置',
          type: 'number',
          name: 'pictureHorizontal',
          value: _.get(styleConfig, '_extra.option.pictureStyle.right', 18),
          onChange(v) {
            updateFn('_extra.option.pictureStyle.right', () => v)
          }
        }),
        new StyleItem({
          title: '垂直位置',
          type: 'number',
          name: 'pictureVertical',
          value: _.get(styleConfig, '_extra.option.pictureStyle.top', 18),
          onChange(v) {
            updateFn('_extra.option.pictureStyle.top', () => v)
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
        new StyleItem(commonStyleItem.fontWeight, {
          title: '显示百分比',
          name:'isPercent',
          value: _.get(styleConfig, '_extra.option.setData.isPercent', false),
          onChange(e) {
            var checked = e.target.checked
            updateFn('_extra.option.setData.isPercent', () => checked ? true : false)
          }
        }),
        new StyleItem({
          title: '显示小数点位数',
          name:'toFixed',
          type:'number',
          min:0,
          value: _.get(styleConfig, '_extra.option.setData.toFixed', 2),
          onChange(v) {
            updateFn('_extra.option.setData.toFixed', () => v)
          }
        })
      ]
    })
  ]
}
