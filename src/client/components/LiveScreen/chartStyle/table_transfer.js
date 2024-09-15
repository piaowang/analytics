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

export default function getTableTransfer(styleConfig, updateFn) {
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
    // new StyleItem({
    //   title: '穿梭框标题',
    //   name: 'transferTitle',
    //   type: 'editorGroup',
    //   items: [
    //     new StyleItem({
    //       name: 'transfer-table-title-fontSize',
    //       title: '字体大小',
    //       type: 'select',
    //       options: fontSizeOp,
    //       defaultValue: _.get(styleConfig, 'transferTitle.fontSize', '12'),
    //       onChange(fontSize) {
    //         updateFn('transferTitle.fontSize', () => ~~fontSize)
    //       }
    //     }),
    //     new StyleItem(commonStyleItem.color, {
    //       title: '文字颜色',
    //       name: 'fontColor',
    //       value: _.get(styleConfig, 'transferTitle.color', '#fff'),
    //       onChange(v) {
    //         updateFn(`transferTitle.color`, () => v)
    //       }
    //     }),
    //     new StyleItem(commonStyleItem.color, {
    //       title: '背景颜色',
    //       name: 'backgroundColor',
    //       value: _.get(styleConfig, 'transferTitle.backgroundColor', ''),
    //       onChange(v) {
    //         updateFn(`transferTitle.backgroundColor`, () => v)
    //       }
    //     })]
    // }),
    new StyleItem({
      title: '穿梭框列表',
      name: 'transferListStyle',
      type: 'editorGroup',
      items: [
        new StyleItem({
          name: 'transfer-table-list-fontSize',
          title: '字体大小',
          type: 'select',
          options: fontSizeOp,
          defaultValue: _.get(styleConfig, 'transferListStyle.fontSize', '12'),
          onChange(fontSize) {
            updateFn('transferListStyle.fontSize', () => ~~fontSize)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '文字颜色',
          name: 'transfer-table-list-fontColor',
          value: _.get(styleConfig, 'transferListStyle.color', '#fff'),
          onChange(v) {
            updateFn(`transferListStyle.color`, () => v)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '背景颜色',
          name: 'transfer-table-list-backgroundColor',
          value: _.get(styleConfig, 'transferListStyle.backgroundColor', ''),
          onChange(v) {
            updateFn(`transferListStyle.backgroundColor`, () => v)
          }
        })]
    }),
    new StyleItem({
      title: '穿梭框样式',
      name: 'transferStyle',
      type: 'editorGroup',
      items: [
        new StyleItem(commonStyleItem.color, {
          title: '背景颜色',
          name: 'transfer-backgroundColor',
          value: _.get(styleConfig, 'transferStyle.backgroundColor', ''),
          onChange(v) {
            updateFn(`transferStyle.backgroundColor`, () => v)
          }
        }),    
        // new StyleItem({
        //   title: '宽度',
        //   type: 'number',
        //   name: 'transfer-width',
        //   value: _.get(styleConfig, 'transferStyle.width', 500),
        //   onChange(v) {
        //     updateFn('transferStyle.width', () => v)
        //   }
        // }),
        new StyleItem({
          title: '高度',
          type: 'number',
          name: 'transfer-height',
          value: _.get(styleConfig, 'transferStyle.height', 500),
          onChange(v) {
            updateFn('transferStyle.height', () => v)
          }
        })]
    }),
    new StyleItem({
      title: '表格动画效果',
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
      title: '表格标题',
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
          name: 'transfer-table-list-content-fontSize',
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
          name: 'transfer-table-fontColor',
          value: _.get(styleConfig, 'head.color', '#fff'),
          onChange(v) {
            updateFn(`head.color`, () => v)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '背景颜色',
          name: 'backgroundColor',
          value: _.get(styleConfig, 'head.backgroundColor', ''),
          onChange(v) {
            updateFn(`head.backgroundColor`, () => v)
          }
        })]
    }),
    new StyleItem({
      title: '表格内容',
      name: 'tableContent',
      type: 'editorGroup',
      items: [
        new StyleItem({
          name: 'transfer-table-content-fontSize',
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
          name: 'fontColor',
          value: _.get(styleConfig, 'content.color', ''),
          onChange(v) {
            updateFn(`content.color`, () => v)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title: '背景颜色',
          name: 'backgroundColor',
          value: _.get(styleConfig, 'content.backgroundColor', ''),
          onChange(v) {
            updateFn(`content.backgroundColor`, () => v)
          }
        })]
    }),
    new StyleItem({
      title: '表格边框样式',
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
          title: '表格横向边框',
          name: 'gapMd',
          type: 'number',
          min: 0,
          max: 8,
          value: parseInt(_.get(styleConfig, 'border.borderLeftWidth', 1)),
          onChange: v => updateFn(`border.borderLeftWidth`, () => v),
          className: 'width-30'
        }),
        new StyleItem({
          title: '纵向边框',
          name: 'gapTd',
          type: 'number',
          min: 0,
          max: 8,
          value: parseInt(_.get(styleConfig, 'border.borderTopWidth', 1)),
          onChange: v => updateFn(`border.borderTopWidth`, () => v),
          className: 'width-30'
        }),
        new StyleItem(commonStyleItem.color, {
          title: '边框颜色',
          name: 'BorderColor',
          value: _.get(styleConfig, 'border.borderColor', '#fff'),
          onChange(v) {
            updateFn(`border.borderColor`, () => v)
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
    }),
    new StyleItem({
      title: '分页器',
      name: 'pagination',
      type: 'editorGroup',
      hidable: true,
      checked: _.get(styleConfig, 'pagination.show', true),
      onChangeVisible: function(e) {
        e.stopPropagation()
        const checked = e.target.checked
        updateFn('pagination.show', () => checked)
      },
      items: [
        new StyleItem(commonStyleItem.color,{
          title: '背景颜色',
          name: 'paginationBackgroundColor',
          value: _.get(styleConfig, 'transferListStyle.paginationBackgroundColor', '#fff'),
          onChange(v) {
            updateFn(`transferListStyle.paginationBackgroundColor`, () => v)
          }
        }),
        new StyleItem(commonStyleItem.color,{
          title: '字体颜色',
          name: 'paginationColor',
          value: _.get(styleConfig, 'transferListStyle.paginationColor', '#000'),
          onChange: v => updateFn(`transferListStyle.paginationColor`, () => v),
        }),
        new StyleItem(commonStyleItem.color,{
          title: '活动项背景颜色',
          name: 'paginationActiveBackgroundColor',
          value: _.get(styleConfig, 'transferListStyle.paginationActiveBackgroundColor', '#fff'),
          onChange(v) {
            updateFn(`transferListStyle.paginationActiveBackgroundColor`, () => v)
          }
        }),
        new StyleItem(commonStyleItem.color,{
          title: '活动项字体颜色',
          name: 'paginationActiveItemColor',
          value: _.get(styleConfig, 'transferListStyle.paginationActiveColor', 'red'),
          onChange: v => updateFn(`transferListStyle.paginationActiveColor`, () => v),
        }),
        new StyleItem({
          title: '每项宽',
          type: 'number',
          name: 'transfer-paginationActiveItem-Width',
          value: _.get(styleConfig, 'transferListStyle.paginationItemWidth', 24),
          onChange(v) {
            updateFn('transferListStyle.paginationItemWidth', () => v + 'px')
          }
        }),
        new StyleItem({
          title: '每项高',
          type: 'number',
          name: 'transfer-paginationActiveItem-height',
          value: _.get(styleConfig, 'transferListStyle.paginationItemHeight', 24),
          onChange(v) {
            updateFn('transferListStyle.paginationItemHeight', () => v + 'px')
          }
        }),
        new StyleItem({
          title: '字体大小',
          type: 'number',
          name: 'transfer-paginationActiveItem-fontSize',
          value: _.get(styleConfig, 'transferListStyle.paginationFontSize', 12),
          onChange(v) {
            updateFn('transferListStyle.paginationFontSize', () => v + 'px')
          }
        })
      ]
    })
  ]
} 