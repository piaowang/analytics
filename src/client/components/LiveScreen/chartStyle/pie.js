import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'
import {immutateUpdates} from '../../../../common/sugo-utils'

export default function getPie(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      percent:true,
      isData:true,
      color: ['#00bde1', '#8e47e7', '#ff5f74', '#fcc04e'],
      series: [{
        radius: [0, '55%'],
        label: {
          normal: { show: true }
        },
        center: ['50%', '50%']
      },
      {
        label: {
          normal: { show: true,
            position: 'inner'
          }
        },
        labelLine: {
          normal: {
            show: true,
            length: 52,
            length2: 52
          }
        }
      }
      ],
      title: {
        show: false,
        x: 'top',
        y: 'top',
        text: '总数',
        textStyle: {
          color: '#fff'
        },
        subtextStyle: {
          color: '#fff'
        }
      },
      legend: {
        show: true,
        textStyle: {
          color: '#fff'
        }
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
        new StyleItem({
          title: '南丁格尔玫瑰图',
          name: 'roseType',
          type: 'checkbox',
          checked: _.get(styleConfig, 'series[0].roseType', false),
          onChange: (e) => {
            const checked = e.target.checked
            updateFn('series[0].roseType', () => checked)
          }
        }),
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
        }),
        new StyleItem({
          title: '位置', name: 'position', type: 'editorGroup', items: [
            new StyleItem(commonStyleItem.radius, {
              title: '水平位置',
              name: 'x',
              value: parseFloat(_.get(styleConfig, 'series[0].center[0]', '50%')) / 100.0,
              onChange(v) {
                updateFn('series[0].center', prev => [`${v * 100}%`, prev ? prev[1] : '50%'])
              }
            }),
            new StyleItem(commonStyleItem.radius, {
              title: '垂直位置',
              name: 'y',
              value: parseFloat(_.get(styleConfig, 'series[0].center[1]', '50%')) / 100.0,
              onChange(v) {
                updateFn('series[0].center', prev => [prev ? prev[0] : '50%', `${v * 100}%`])
              }
            })
          ]
        }),
        new StyleItem({
          title: '半径', name: 'radius', type: 'editorGroup', items: [
            new StyleItem(commonStyleItem.radius, {
              title: '内半径',
              name: 'innerRadius',
              value: parseFloat(_.get(styleConfig, 'series[0].radius[0]', 0)) / 100.0,
              onChange(v) {
                updateFn('series[0].radius', prev => [`${v * 100}%`, prev ? prev[1] : '55%'])
              }
            }),
            new StyleItem(commonStyleItem.radius, {
              title: '外半径',
              name: 'outterRadius',
              value: parseFloat(_.get(styleConfig, 'series[0].radius[1]', '55%')) / 100.0,
              onChange(v) {
                updateFn('series[0].radius', prev => [prev ? prev[0] : '', `${v * 100}%`])
              }
            })
          ]
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
        const checked = e.target.checked
        updateFn('title.show', () =>  checked)
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
        })
      ]
    }),
    new StyleItem({
      title: '百分比、数值',
      name: 'dataSetting',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '位置',
          name: 'titlePosition',
          type: 'select',
          options: [
            { key: 'inner', value: '内部' },
            { key: 'outside', value: '外部' }
          ],
          value: _.get(styleConfig, 'series[1].label.normal.position', 'inner'),
          onChange(v) {
            updateFn('series[1].label.normal.position', () => v
            )
          }
        }),
        new StyleItem({
          title: '第一段引导线长度',
          name: 'oneLength',
          type: 'number',
          min:0,
          value: _.get(styleConfig, 'series[1].labelLine.normal.length', 52),
          onChange(v) {
            updateFn('series[1].labelLine.normal.length', () => v
            )
          }
        }),
        new StyleItem({
          title: '第二段引导线长度',
          name: 'twoLength',
          type: 'number',
          min:0,
          value: _.get(styleConfig, 'series[1].labelLine.normal.length2', 52),
          onChange(v) {
            updateFn('series[1].labelLine.normal.length2', () => v
            )
          }
        }),
        new StyleItem({
          title: '百分比',
          name: 'percentSetting',
          type: 'checkbox',
          checked: _.get(styleConfig, 'percent', true),
          onChange: (e) => {
            const checked = e.target.checked
            updateFn('percent', () => checked)
          }
        }),
        new StyleItem({
          title: '数值',
          name: 'data2Setting',
          type: 'checkbox',
          checked: _.get(styleConfig, 'isData', true),
          onChange: (e) => {
            const checked = e.target.checked
            updateFn('isData', () => checked)
          }
        })
      ]
    }),
    commonStyleItem.getLegendItem(styleConfig, updateFn)
  ]
}
