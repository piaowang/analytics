import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'
import { Row, Col, InputNumber } from 'antd'

const fontSizeOp = [
  { key: '12', value: '12px' },
  { key: '18', value: '18px' },
  { key: '24', value: '24px' },
  { key: '32', value: '32px' },
  { key: '48', value: '48px' },
  { key: '64', value: '64px' },
  { key: '128', value: '128px' }
]

export default function getTable(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      // TODO
      head: {
        fontSize: '12px',
        backgroundColor: 'rgba(0,0,0,0)',
        color: '#fff',
        show: true
      },
      content: {
        fontSize: '12px',
        backgroundColor: 'rgba(0,0,0,0)',
        color: '#fff'
      },
      border: {
        borderTopWidth: '1',
        borderLeftWidth: '1',
        borderStyle: 'solid',
        borderColor: '#fff'
      },
      scrolling: false
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '动画效果',
      name: 'tableAnimation',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '滚动播放',
          name: 'roseType',
          type: 'checkbox',
          checked: _.get(styleConfig, 'scrolling', false),
          onChange: (e) => {
            const checked = e.target.checked
            updateFn('scrolling', () => checked)
          }
        })
      ]
    }),
    new StyleItem({
      title: '标题',
      name: 'tableTitle',
      type: 'editorGroup',
      hidable: true,
      checked: _.get(styleConfig, 'head.show', true),
      onChangeVisible: function(e) {
        e.stopPropagation()
        const checked = e.target.checked
        updateFn('head.show', () => checked)
      },
      items: [
        new StyleItem({
          name: 'table-fontSize',
          title: '字体大小',
          type: 'select',
          options: fontSizeOp,
          defaultValue: _.get(styleConfig, 'head.fontSize', '12'),
          onChange(fontSize) {
            updateFn('head.fontSize', () => ~~fontSize)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '文字颜色',
          name: 'fontColor',
          value: _.get(styleConfig, 'head.color', '#fff'),
          onChange(v) {
            updateFn('head.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '背景颜色',
          name: 'backgroundColor',
          value: _.get(styleConfig, 'head.backgroundColor', ''),
          onChange(v) {
            updateFn('head.backgroundColor', () => v)
          }
        })]
    }),
    new StyleItem({
      title: '内容',
      name: 'tableContent',
      type: 'editorGroup',
      items: [
        new StyleItem({
          name: 'expandIcon',
          type: 'checkbox',
          title: '展开按钮',
          checked: _.get(styleConfig, 'expand_icon.show', false),
          defaultValue: _.get(styleConfig, 'expand_icon.show', false),
          onChange() {
            updateFn('expand_icon.show', (v) => !v)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '展开按钮颜色',
          name: 'tableContentButtonFontColor',
          value: _.get(styleConfig, 'expand_icon.backgroundColor', ''),
          onChange(v) {
            updateFn('expand_icon.backgroundColor', () => v)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '展开按钮文字颜色',
          name: 'tableContentfontColor',
          value: _.get(styleConfig, 'expand_icon.color', ''),
          onChange(v) {
            updateFn('expand_icon.color', () => v)
          }
        }),
        new StyleItem({
          name: 'table-fontSize',
          type: 'select',
          title: '字体大小',
          options: fontSizeOp,
          defaultValue: _.get(styleConfig, 'content.fontSize', '12'),
          onChange(fontSize) {
            updateFn('content.fontSize', () => ~~fontSize)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '文字颜色',
          name: 'tableContentColor',
          value: _.get(styleConfig, 'content.color', ''),
          onChange(v) {
            updateFn('content.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '背景颜色',
          name: 'backgroundColor',
          value: _.get(styleConfig, 'content.backgroundColor', ''),
          onChange(v) {
            updateFn('content.backgroundColor', () => v)
          }
        })]
    }),
    new StyleItem({
      title: '边框样式',
      name: 'tableBorder',
      type: 'editorGroup',
      items: [
        // new StyleItem(commonStyleItem.radius, {
        //   title: '边框宽度',
        //   name: 'borderWidth',
        //   min: 0,
        //   max: 5,
        //   step: 1,
        //   value: parseInt(_.get(styleConfig, 'border.borderWidth', 1)),
        //   onChange(v) {
        //     updateFn('border.borderWidth', () => v)
        //   }
        // }),
        new StyleItem({
          title: '横向边框',
          name: 'gapMd',
          type: 'number',
          min: 0,
          max: 8,
          value: parseInt(_.get(styleConfig, 'border.borderLeftWidth', 1)),
          onChange: v => updateFn('border.borderLeftWidth', () => v),
          className: 'width-30'
        }),
        new StyleItem({
          title: '纵向边框',
          name: 'gapTd',
          type: 'number',
          min: 0,
          max: 8,
          value: parseInt(_.get(styleConfig, 'border.borderTopWidth', 1)),
          onChange: v => updateFn('border.borderTopWidth', () => v),
          className: 'width-30'
        }),
        new StyleItem(commonStyleItem.color, {
          title: '边框颜色',
          name: 'BorderColor',
          value: _.get(styleConfig, 'border.borderColor', '#fff'),
          onChange(v) {
            updateFn('border.borderColor', () => v)
          }
        }),
        new StyleItem(commonStyleItem.color,
          {
            title: '边框样式',
            name: 'BorderStyle',
            type: 'select',
            options: [{ key: 'solid', value: '实线' }, { key: 'dashed', value: '虚线' }],
            value: _.get(styleConfig, 'border.borderStyle', 'solid'),
            onChange(v) {
              updateFn('border.borderStyle', () => v)
            }
          }
        )
      ]
    })
  ]
} 
