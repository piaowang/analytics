import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'
import {immutateUpdates} from '../../../../common/sugo-utils'

export default function getTreemap(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      componentUnit: '',
      tooltipStyle: {},
      tooltipShow: true,
      color: ['#C67D52'],
      tooltip: {
        confine: true,
        trigger: 'item',
        // formatter: '{b} : {c} ({d}%)'
        formatter: (params) => {
          console.log('=====',params)
          return `${params.name}:${params.value}`
        }
      },
      legend: {
        show: false
      }
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '图形样式',
      name: 'pieShape',
      type: 'editorGroup',
      value: _.get(styleConfig, 'series[0].center'),
      items: [
        commonStyleItem.getColorItem(styleConfig, updateFn),
        new StyleItem({
          title: '标签',
          name: 'label',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'series[0].label.normal.show', true),
          onChangeVisible: function (e) {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('series[0]', s0 => immutateUpdates(s0,
              'label.normal.show', () => checked,
              'labelLine.normal.show', () => checked))
          },
          items: _.get(styleConfig, 'series[0].label.normal.show', true) ? [
            new StyleItem(commonStyleItem.fontFamily, {
              title: '字体',
              value: _.get(styleConfig, 'series[0].label.normal.textStyle.fontFamily', 'Microsoft Yahei'),
              onChange: function (fontFamily) {
                updateFn('series[0].label.normal.textStyle.fontFamily', () => fontFamily)
              }
            }),
            new StyleItem(commonStyleItem.fontSize, {
              value: _.get(styleConfig, 'series[0].label.normal.textStyle.fontSize', '12') + '',
              onChange: function (fontSize) {
                updateFn('series[0].label.normal.textStyle.fontSize', () => parseInt(fontSize))
              }
            }),
            new StyleItem({
              name: 'fontcolor', type: 'group', items: [
                new StyleItem({
                  title: '文字颜色跟随图形',
                  name: 'default',
                  type: 'checkbox',
                  span: 24,
                  checked: _.isEmpty(_.get(styleConfig, 'series[0].label.normal.textStyle.color')),
                  onChange: function (e) {
                    const checked = e.target.checked
                    updateFn('series[0].label.normal.textStyle.color', () => checked ? null : '#fff')
                  }
                }),
                !_.isEmpty(_.get(styleConfig, 'series[0].label.normal.textStyle.color')) ? new StyleItem(commonStyleItem.color, {
                  title: '文字颜色',
                  name: 'color',
                  span: 24,
                  value: _.get(styleConfig, 'series[0].label.normal.textStyle.color', '#fff'),
                  onChange: function (color) {
                    updateFn('series[0].label.normal.textStyle.color', () => color)
                  }
                }) : false
              ]
            })
          ] : []
        })
      ]
    }),
    new StyleItem({
      title: '标题设置',
      name: 'titleSetting',
      type: 'editorGroup',
      hidable: true,
      checked: _.get(styleConfig, 'title.show', true),
      onChangeVisible: function(e) {
        e.stopPropagation()
        updateFn('title.show', () =>  e.target.checked)
      },
      items: [
        new StyleItem({
          title: '位置',
          name: 'titlePosition',
          type: 'select',
          options: [
            { key: 'top', value: '顶部' },
            { key: 'center', value: '居中' }
          ],
          value: _.get(styleConfig, 'title.x', 'center'),
          onChange(v) {
            updateFn('title', s0 => immutateUpdates(s0,
              'x', () => v,
              'y', () => v))
          }
        }),
        new StyleItem({
          title: '主标题',
          name: 'title',
          type: 'editorGroup',
          items: [
            new StyleItem({
              name: 'titleText',
              title:'内容',
              type: 'input',
              value: _.get(styleConfig, 'title.text', ''),
              onChange: function(e) {
                updateFn('title.text', () => e.target.value)
              }
            }),
            new StyleItem(commonStyleItem.fontSize, {
              name: 'textStyleSize',
              value: _.get(styleConfig, 'title.textStyle.fontSize', '12'),
              onChange: function(fontSize) {
                updateFn('title.textStyle.fontSize', () => parseInt(fontSize))
              }
            }),
            new StyleItem(commonStyleItem.fontFamily, {
              value: _.get(styleConfig, 'title.textStyle.fontFamily', 'Microsoft Yahei'),
              onChange(v){
                updateFn('title.textStyle.fontFamily', () => v)
              }
            }),
            new StyleItem(commonStyleItem.color, {
              name: 'textStyleColor',
              value: _.get(styleConfig, 'title.textStyle.color', '#fff'),
              onChange: function(color) {
                updateFn('title.textStyle.color', () => color)
              }
            })
          ]
        }),
        new StyleItem({
          title: '子标题',
          name: 'subTitle',
          type: 'editorGroup',
          items: [
            new StyleItem(commonStyleItem.fontSize, {
              name: 'subTitleStyleSize',
              value: _.get(styleConfig, 'title.subtextStyle.fontSize', '12'),
              onChange: function(fontSize) {
                updateFn('title.subtextStyle.fontSize', () => parseInt(fontSize))
              }
            }),
            new StyleItem(commonStyleItem.fontFamily, {
              value: _.get(styleConfig, 'title.subtextStyle.fontFamily', 'Microsoft Yahei'),
              onChange(v){
                updateFn('title.subtextStyle.fontFamily', () => v)
              }
            }),
            new StyleItem(commonStyleItem.color, {
              name: 'subTextStyleColor',
              value: _.get(styleConfig, 'title.subtextStyle.color', '#fff'),
              onChange: function(color) {
                updateFn('title.subtextStyle.color', () => color)
              }
            })
          ]
        }),
        new StyleItem({
          title: '点击移动',
          name: 'nodeClick',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'series[0].nodeClick', false),
          onChangeVisible: function(e) {
            e.stopPropagation()
            updateFn('series[0].nodeClick', () =>  e.target.checked === true ? 'zoomToNode' : false)
          }})   
      ]
    }),
    commonStyleItem.getLegendItem(styleConfig, updateFn),
    new StyleItem({
      title: '数值',
      name: 'tooltipShow',
      type: 'editorGroup',
      hidable: true,
      checked: _.get(styleConfig, 'tooltipShow', true),
      onChangeVisible: function (e) {
        e.stopPropagation()
        const checked = e.target.checked
        updateFn('tooltipShow', () => checked)
      },
      items: [
        new StyleItem({
          title: '单位',
          name: 'componentUnit',
          type: 'input',
          value: _.get(styleConfig, 'componentUnit', ''),
          onChange(ev) {
            let {value} = ev.target
            updateFn('componentUnit', () => value)
          }
        }),
        new StyleItem({
          title: '颜色',
          name: 'tooltipColor',
          type: 'color',
          value: _.get(styleConfig, 'tooltipStyle.color', ''),
          onChange(v) {
            updateFn('tooltipStyle.color', () => v)
          }
        }),
        new StyleItem({
          title: '文字大小',
          name: 'tooltipFontSize',
          type: 'number',
          min: 10,
          max: 100,
          value: _.get(styleConfig, 'tooltipStyle.fontSize', '12'),
          onChange(v) {
            updateFn('tooltipStyle.fontSize', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontFamily, {
          name: 'tooltipFontFamily',
          value: _.get(styleConfig, 'tooltipStyle.fontFamily', 'Microsoft Yahei'),
          onChange(v) {
            updateFn('tooltipStyle.fontFamily', () => v)
          }
        })
      ]
    })
  ]
}
