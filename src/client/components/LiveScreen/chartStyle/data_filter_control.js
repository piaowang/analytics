import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'


export default function getDataFilterControl(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      defaultActive: '',
      showAllOption: true,
      notActive: {
        fontSize: '30px',
        background: 'rgba(0,0,0,0)',
        color: '#fff',
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: 'none',
        borderLeft: 'none',
        padding: '10px 20px'
      },
      active: {
        fontSize: '30px',
        background: 'rgba(0,0,0,0)',
        color: '#F4A06F',
        borderTop: 'none',
        borderRight: 'none',
        borderBottom: '1px solid #F4A06F',
        borderLeft: 'none',
        padding: '10px 20px'
      }
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '是否日期',
      name: 'isDate',
      type: 'editorGroup',
      hidable: true,
      checked: _.get(styleConfig, 'isDate', false),
      onChangeVisible: function(e) {
        e.stopPropagation()
        const checked = e.target.checked
        updateFn('isDate', () => checked ? 'YYYY-MM-DD HH:mm:ss' : false)
      }
    }, {
      items: [
        new StyleItem({
          title: '格式化样式',
          name: 'dateFormater',
          type: 'select',
          value: _.get(styleConfig, 'isDate', false),
          onChange(v) {
            updateFn('isDate', () => v)
          },
          options: [
            {key: 'YYYY-MM-DD HH:mm:ss', value: 'YYYY-MM-DD HH:mm:ss'},
            {key: 'YYYY-MM-DD', value: 'YYYY-MM-DD'},
            {key: 'YYYY/MM/DD', value: 'YYYY/MM/DD'},
          ]
        }),
      ]
    }),
    new StyleItem({
      title: '基础设置',
      name: 'basic',
      type: 'editorGroup'
    }, {
      items: [
        new StyleItem({
          title: '是否显示“全部”',
          name: 'showAllOption',
          type: 'checkbox',
          value: _.get(styleConfig, 'showAllOption', false),
          onChange(ev) {
            let {checked} = ev.target
            updateFn('showAllOption', () => checked)
          }
        }),
        new StyleItem({
          title: '默认选中',
          name: 'defaultActive',
          type: 'input',
          value: _.get(styleConfig, 'defaultActive', ''),
          onChange(ev) {
            let {value} = ev.target
            updateFn('defaultActive', () => value)
          }
        }),
        new StyleItem({
          title: '显示个数("全部"除外)',
          name: 'defaultShowNum',
          type: 'number',
          value: _.get(styleConfig, 'defaultShowNum', 6),
          onChange(v) {
            updateFn('defaultShowNum', () => v)
          }
        })
      ]
    }),
    new StyleItem({
      title: '标题未选中样式',
      name: 'unselectedStyle',
      type: 'editorGroup',
      checked: _.get(styleConfig, 'notActive.show', true),
      items: [
        new StyleItem(commonStyleItem.fontSize, {
          value: _.get(styleConfig, 'notActive.fontSize', '30px') + '',
          onChange(v) {
            updateFn('notActive.fontSize', () => ~~v)
          }
        }),
        new StyleItem(commonStyleItem.fontWeight, {
          value: _.get(styleConfig, 'notActive.fontWeight', 'normal'),
          onChange(e) {
            let checked = e.target.checked
            updateFn('notActive.fontWeight', () => checked ? 'bold' : 'normal')
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '文字颜色',
          name: 'fontColor',
          value: _.get(styleConfig, 'notActive.color', '#fff'),
          onChange(v) {
            updateFn('notActive.color', () => v)
          }
        }),
        new StyleItem({
          title: '背景',
          name: 'background',
          type: 'color',
          value: _.get(styleConfig, 'notActive.background', ''),
          onChange(ev) {
            let {value} = ev.target
            updateFn('notActive.background', () => value)
          }
        }),
        new StyleItem({
          title: '上边框',
          name: 'borderTop',
          type: 'borderConfigPanel',
          value: _.get(styleConfig, 'notActive.borderTop', ''),
          onChange(value) {
            updateFn('notActive.borderTop', () => value)
          }
        }),
        new StyleItem({
          title: '右边框',
          name: 'borderRight',
          type: 'borderConfigPanel',
          value: _.get(styleConfig, 'notActive.borderRight', ''),
          onChange(value) {
            updateFn('notActive.borderRight', () => value)
          }
        }),
        new StyleItem({
          title: '下边框',
          name: 'borderBottom',
          type: 'borderConfigPanel',
          value: _.get(styleConfig, 'notActive.borderBottom', ''),
          onChange(value) {
            updateFn('notActive.borderBottom', () => value)
          }
        }),
        new StyleItem({
          title: '左边框',
          name: 'borderLeft',
          type: 'borderConfigPanel',
          value: _.get(styleConfig, 'notActive.borderLeft', ''),
          onChange(value) {
            updateFn('notActive.borderLeft', () => value)
          }
        }),
        new StyleItem({
          title: '边距样式',
          name: 'padding',
          type: 'input',
          value: _.get(styleConfig, 'notActive.padding', ''),
          onChange(ev) {
            let {value} = ev.target
            updateFn('notActive.padding', () => value)
          }
        })
      ]
    }),
    new StyleItem({
      title: '选中后样式',
      name: 'selectedStyle',
      type: 'editorGroup',
      items: [
        new StyleItem(commonStyleItem.fontSize, {
          value: _.get(styleConfig, 'active.fontSize', '30px') + '',
          onChange(v) {
            updateFn('active.fontSize', () => ~~v)
          }
        }),
        new StyleItem(commonStyleItem.fontWeight, {
          value: _.get(styleConfig, 'active.fontWeight', 'normal'),
          onChange(e) {
            let checked = e.target.checked
            updateFn('active.fontWeight', () => checked ? 'bold' : 'normal')
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '文字颜色',
          name: 'fontColor',
          value: _.get(styleConfig, 'active.color', '#fff'),
          onChange(v) {
            updateFn('active.color', () => v)
          }
        }),
        new StyleItem({
          title: '背景',
          name: 'background',
          type: 'color',
          value: _.get(styleConfig, 'active.background', ''),
          onChange(ev) {
            let {value} = ev.target
            updateFn('active.background', () => value)
          }
        }),
        new StyleItem({
          title: '上边框',
          name: 'borderTop',
          type: 'borderConfigPanel',
          value: _.get(styleConfig, 'active.borderTop', ''),
          onChange(value) {
            updateFn('active.borderTop', () => value)
          }
        }),
        new StyleItem({
          title: '右边框',
          name: 'borderRight',
          type: 'borderConfigPanel',
          value: _.get(styleConfig, 'active.borderRight', ''),
          onChange(value) {
            updateFn('active.borderRight', () => value)
          }
        }),
        new StyleItem({
          title: '下边框',
          name: 'borderBottom',
          type: 'borderConfigPanel',
          value: _.get(styleConfig, 'active.borderBottom', ''),
          onChange(value) {
            updateFn('active.borderBottom', () => value)
          }
        }),
        new StyleItem({
          title: '左边框',
          name: 'borderLeft',
          type: 'borderConfigPanel',
          value: _.get(styleConfig, 'active.borderLeft', ''),
          onChange(value) {
            updateFn('active.borderLeft', () => value)
          }
        }),
        new StyleItem({
          title: '边距样式',
          name: 'padding',
          type: 'input',
          value: _.get(styleConfig, 'active.padding', ''),
          onChange(ev) {
            let {value} = ev.target
            updateFn('active.padding', () => value)
          }
        })
      ]
    })
  ]
} 
