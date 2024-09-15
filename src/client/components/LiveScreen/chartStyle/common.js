import StyleItem from '../models/styleItem'
import { immutateUpdate, remove } from '../../../../common/sugo-utils'
import _ from 'lodash'
import PubSub from 'pubsub-js'

// 通用样式配置项
const commonStyleItem = {
  textAlign: new StyleItem({
    title: '对齐方式',
    name: 'align',
    type: 'select',
    options: [{ key: 'left', value: '左对齐'}, { key: 'right', value: '右对齐'}, { key: 'center', value: '居中对齐'}]
  }),
  fontFamily: new StyleItem({
    title: '字体',
    name: 'fontFamily',
    type: 'select',
    options: [
      { key: 'Microsoft Yahei', value: '微软雅黑'},
      { key: 'SimSun', value: '宋体'},
      { key: 'SimHei', value: '黑体'},
      { key: 'LiSu', value: '隶书'},
      { key: 'YouYuan', value: '幼圆'},
      { key: 'tahoma', value: 'tahoma'},
      { key: 'Helvetica', value: 'Helvetica'},
      { key: 'Arial', value: 'Arial'},
      { key: 'sans-serif', value: 'sans-serif'},
      { key: 'digital7', value: 'digital7'}
    ]
  }),
  fontSize: new StyleItem({
    title: '文字大小(px)',
    name: 'fontSize',
    type: 'number',
    min: 10,
    max: 100
  }),
  fontWeight: new StyleItem({
    title: '粗体字',
    name: 'fontWeight',
    type: 'checkbox'
  }),
  color: new StyleItem({
    title: '颜色',
    name: 'fontColor',
    type: 'color'
    // type2: 'rgba',
  }),
  radius: new StyleItem({
    title: '半径',
    name: 'radius',
    type: 'slider',
    min: 0,
    max: 1,
    step: 0.01,
    onChangeDebounce: 100
  }),
  position: new StyleItem({
    title: '位置',
    name: 'position',
    type: 'select',
    options: [
      { key: 'top', value: '顶部居中' },
      { key: 'tl', value: '顶部居左' },
      { key: 'tr', value: '顶部居右' },
      { key: 'bottom', value: '底部居中' },
      { key: 'bl', value: '底部居左' },
      { key: 'br', value: '底部居右' }
    ]
  }),
  lineStyle: new StyleItem({
    title: '样式',
    name: 'lineStyle',
    type: 'select',
    options: [
      { key: 'solid', value: '直线'},
      { key: 'dotted', value: '点点线'},
      { key: 'dashed', value: '虚线'}
    ]
  }),
  optionsOverWriter: new StyleItem({
    title: '样式修改器',
    name: 'optionsOverWriter',
    type: 'optionsOverWriter',
    defaultValue: `((opts, theme, data, utils) => {
  return {
    ...opts,
    css: {
      /* emotionjs */
    }
  }
})`
  }),
  getIcons: (styleConfig, updateFn, option = {}) => {
    const { iconsUrl = [] } = styleConfig
    const { addable = true } = option
    return new StyleItem({
      title: '图标',
      name: 'icon',
      type: 'editorGroup',
      addable: true,
      onAdd: function(e) {
        e.stopPropagation()
        updateFn('iconsUrl', prev => [...(prev || []), {scope:0, iconSrc: '', iconType: 'antd'}])
      },
      items: iconsUrl.map((iconUrl, i) => {
        return new StyleItem({
          title: `图标${i+1}`,
          name: `iconUrl${i}`,
          type: 'fileToDataUrlScope',
          value: iconUrl,
          deletable: true,
          onDelete() {
            updateFn('iconsUrl', prev => remove(prev, i))
          },
          onChange(iconUrl) {
            updateFn('iconsUrl', prev => {
              return immutateUpdate(prev, i, () => ({...iconsUrl[i],...iconUrl}))
            }
            )
          }
        })  
      }  
      ),
      ...option
    })
  },
  setWarning: (styleConfig, updateFn, option = {}) => {
    const { setWarning = [] } = styleConfig
    const { addable = true } = option
    return new StyleItem({
      title: '颜色',
      name: 'icon',
      type: 'editorGroup',
      addable,
      onAdd: function(e) {
        e.stopPropagation()
        updateFn('setWarning', prev => [...(prev || []), {scope:0, colorStart: 'white', colorEnd: 'black'}])
      },
      items: setWarning.map((item, i) => {
        return new StyleItem({
          title: `颜色${i+1}`,
          name: `item${i}`,
          type: 'setColorScope',
          value: item,
          deletable: true,
          onDelete() {
            updateFn('setWarning', prev => remove(prev, i))
          },
          onChange(item) {
            updateFn('setWarning', prev => {
              return immutateUpdate(prev, i, () => ({...setWarning[i],...item}))
            }
            )
          }
        })  
      }  
      ),
      ...option
    })
  },
  getColorItem: (styleConfig, updateFn, option = {}) => {
    const { color = [] } = styleConfig
    const { addable = true } = option
    return new StyleItem({
      title: '图形颜色',
      name: 'pieColor',
      type: 'editorGroup',
      addable,
      onAdd: function(e) {
        e.stopPropagation()
        updateFn('color', prev => [...prev, '#fff'])
      },
      items: color.map((color, i) => new StyleItem(commonStyleItem.color, {
        title: `颜色${i+1}`,
        name: `color${i}`,
        value: color,
        deletable: true,
        onDelete() {
          updateFn('color', prev => remove(prev, i))
        },
        onChange(color) {
          updateFn('color', prev => immutateUpdate(prev, i, () => color))
        }
      })),
      ...option
    })
  },
  getLegendItem: (styleConfig, updateFn) => {
    return new StyleItem({
      title: '图例',
      name: 'legend',
      type: 'editorGroup',
      hidable: true,
      checked: _.get(styleConfig, 'legend.show', true),
      onChangeVisible: function(e) {
        e.stopPropagation()
        const checked = e.target.checked
        updateFn('legend.show', () => checked)
      },
      items: [
        new StyleItem({
          title: '文本',
          name: 'textStyle',
          type: 'editorGroup',
          items: [
            new StyleItem(commonStyleItem.fontSize, {
              name: 'legendFontSize',
              value: _.get(styleConfig, 'legend.textStyle.fontSize', '12') + '',
              onChange: function(fontSize) {
                updateFn('legend.textStyle.fontSize', () => parseInt(fontSize))
              }
            }),
            new StyleItem(commonStyleItem.color, {
              name: 'legendFontColor',
              value: _.get(styleConfig, 'legend.textStyle.color', '#fff') + '',
              onChange: function(color) {
                updateFn('legend.textStyle.color', () => color)
              }
            })
          ]
        }),
        new StyleItem({
          title: '布局',
          name: 'layout',
          type: 'editorGroup',
          items: [
            new StyleItem({
              title: '间隔',
              name: 'gap',
              type: 'number',
              value: _.get(styleConfig, 'legend.itemGap', 10),
              className: 'width-30',
              onChange(v) {
                updateFn('legend.itemGap', () => v)
              }
            }),
            new StyleItem(commonStyleItem.position, {
              value: _.get(styleConfig, 'legend._position', 'top') + '',
              onChange(_position) {
                switch (_position) {
                  case 'top':
                    updateFn('legend', prev => ({...prev, left: 'center', top: 'top', _position}))
                    break
                  case 'tl':
                    updateFn('legend', prev => ({...prev, left: 'left', top: 'top', _position}))
                    break
                  case 'tr':
                    updateFn('legend', prev => ({...prev, left: 'right', top: 'top', _position}))
                    break
                  case 'bottom':
                    updateFn('legend', prev => ({...prev, left: 'center', top: 'bottom', _position}))
                    break
                  case 'bl':
                    updateFn('legend', prev => ({...prev, left: 'left', top: 'bottom', _position}))
                    break
                  case 'br':
                    updateFn('legend', prev => ({...prev, left: 'right', top: 'bottom', _position}))
                    break
                }
              }
            }),
            new StyleItem({
              title: '朝向',
              name: 'orient',
              type: 'select',
              options: [
                { key: 'horizontal', value: '水平' },
                { key: 'vertical', value: '垂直' }
              ],
              value: _.get(styleConfig, 'legend.orient', 'horizontal'),
              onChange(v) {
                updateFn('legend.orient', () => v)
              }
            })
          ]
        })
      ]
    })
  },
  getxAxisItem: (styleConfig, updateFn,) => {
    return new StyleItem({
      title: 'x轴',
      name: 'xAxis',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '文本',
          name: 'text',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'xAxis.axisLabel.show', true),
          onChangeVisible: (e) => {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('xAxis.axisLabel.show', () => checked)
          },
          items: _.get(styleConfig, 'xAxis.axisLabel.show', true) ? [
            new StyleItem(commonStyleItem.fontSize, {
              value: _.get(styleConfig, 'xAxis.axisLabel.textStyle.fontSize', '12') + '',
              onChange(v) {
                updateFn('xAxis.axisLabel.textStyle.fontSize', () => v)
              }
            }),
            new StyleItem(commonStyleItem.color, {
              title: '颜色',
              name: 'fontColor',
              value: _.get(styleConfig, 'xAxis.axisLabel.textStyle.color', '#fff'),
              onChange(v) {
                updateFn('xAxis.axisLabel.textStyle.color', () => v)
              }
            })
          ] : []
        }),
        new StyleItem({
          title: '网格线',
          name: 'xAxisLineColor',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'xAxis.splitLine.show', true),
          onChangeVisible: (e) => {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('xAxis.splitLine.show', () => checked)
          },
          items: _.get(styleConfig, 'xAxis.splitLine.show', true) ? [
            new StyleItem(commonStyleItem.color, {
              title: '颜色',
              name: 'fontColor',
              value: _.get(styleConfig, 'xAxis.splitLine.lineStyle.color', '#fff'),
              onChange(v) {
                updateFn('xAxis.splitLine.lineStyle.color', () => v)
              }
            }),
            new StyleItem(commonStyleItem.lineStyle, {
              name: 'xAxisLineStyle',
              value: _.get(styleConfig, 'xAxis.splitLine.lineStyle.type', 'dashed'),
              onChange(v) {
                updateFn('xAxis.splitLine.lineStyle.type', () => v)
              }
            })
          ] : []
        }),
        new StyleItem({
          title: '轴标签',
          name: 'axisLabel',
          type: 'editorGroup',
          items: [
            new StyleItem({
              title: '角度',
              name: 'rotate',
              type: 'select',
              options: [
                { key: 'auto', value: '自动'},
                { key: '0', value: '水平'},
                { key: '45', value: '斜角'},
                { key: '90', value: '垂直'}
              ],
              value: _.get(styleConfig, 'xAxis.axisLabel.rotate', '0'),
              onChange(v) {
                updateFn('xAxis.axisLabel.rotate', () => v)
              }
            })
          ]
        }),
        new StyleItem({
          title: '轴线',
          name: 'xAxisLine',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'xAxis.axisLine.show', true),
          onChangeVisible: (e) => {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('xAxis.axisLine.show', () => checked)
          },
          items: _.get(styleConfig, 'xAxis.axisLine.show', true)
            ? [
              new StyleItem(commonStyleItem.color, {
                title: '颜色',
                name: 'fontColor',
                value: _.get(styleConfig, 'xAxis.axisLine.lineStyle.color', '#fff'),
                onChange(v) {
                  updateFn('xAxis.axisLine.lineStyle.color', () => v)
                }
              }),
              new StyleItem(commonStyleItem.lineStyle, {
                name: 'xAxisLineStyle',
                value: _.get(styleConfig, 'xAxis.axisLine.lineStyle.type', 'solid'),
                onChange(v) {
                  updateFn('xAxis.axisLine.lineStyle.type', () => v)
                }
              })
            ]
            : []
        }),
        new StyleItem({
          title: '最小值',
          name: 'yAxisMin',
          type: 'number',
          value: _.get(styleConfig, 'xAxis.min', 0),
          onChange(v){
            updateFn('xAxis.min', () => v)
          }
        }),
        new StyleItem({
          title: '间隔大小',
          name: 'yAxisInterval',
          type: 'number',
          value: _.get(styleConfig, 'xAxis.interval', 0),
          onChange(v){
            updateFn('xAxis.interval', () => v)
          }
        })
      ]
    })
  },
  getyAxisItem: (styleConfig, updateFn) => {
    return new StyleItem({
      title: 'y轴',
      name: 'y-axis',
      type: 'editorGroup',
      items: [
        new StyleItem({ 
          title: '文本',
          name: 'text',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'yAxis.axisLabel.show', true),
          onChangeVisible: (e) => {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('yAxis.axisLabel.show', () => checked)
          },
          items: _.get(styleConfig, 'yAxis.axisLabel.show', true) ? [
            new StyleItem(commonStyleItem.fontSize, {
              value: _.get(styleConfig, 'yAxis.axisLabel.textStyle.fontSize', '12') + '',
              onChange(v) {
                updateFn('yAxis.axisLabel.textStyle.fontSize', () => v)
              }
            }),
            new StyleItem(commonStyleItem.color, { 
              title: '颜色', 
              name: 'fontColor',
              value: _.get(styleConfig, 'yAxis.axisLabel.textStyle.color', '#fff'),
              onChange(v) {
                updateFn('yAxis.axisLabel.textStyle.color', () => v)
              }
            })
          ] : []
        }),
        new StyleItem({
          title: '网格线',
          name: 'yAxisLineColor',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'yAxis.splitLine.show', true),
          onChangeVisible: (e) => {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('yAxis.splitLine.show', () => checked)
          },
          items: _.get(styleConfig, 'yAxis.splitLine.show', true) ? [
            new StyleItem(commonStyleItem.color, { 
              title: '颜色', 
              name: 'fontColor',
              value: _.get(styleConfig, 'yAxis.splitLine.lineStyle.color', '#fff'),
              onChange(v) {
                updateFn('yAxis.splitLine.lineStyle.color', () => v)
              }
            }),
            new StyleItem(commonStyleItem.lineStyle ,{
              name: 'yAxisLineStyle',
              value: _.get(styleConfig, 'yAxis.splitLine.lineStyle.type', 'dashed'),
              onChange(v) {
                updateFn('yAxis.splitLine.lineStyle.type', () => v)
              }
            })
          ] : []
        }),
        new StyleItem({
          title: '轴线',
          name: 'yAxisLine',
          type: 'editorGroup',
          hidable: true,
          checked: _.get(styleConfig, 'yAxis.axisLine.show', true),
          onChangeVisible: (e) => {
            e.stopPropagation()
            const checked = e.target.checked
            updateFn('yAxis.axisLine.show', () => checked)
          },
          items: _.get(styleConfig, 'yAxis.axisLine.show', true)
            ? [
              new StyleItem(commonStyleItem.color, {
                title: '颜色',
                name: 'fontColor',
                value: _.get(styleConfig, 'yAxis.axisLine.lineStyle.color', '#fff'),
                onChange(v) {
                  updateFn('yAxis.axisLine.lineStyle.color', () => v)
                }
              }),
              new StyleItem(commonStyleItem.lineStyle, {
                name: 'yAxisLineStyle',
                value: _.get(styleConfig, 'yAxis.axisLine.lineStyle.type', 'solid'),
                onChange(v) {
                  updateFn('yAxis.axisLine.lineStyle.type', () => v)
                }
              })
            ]
            : []
        }),
        new StyleItem({
          title: '最小值',
          name: 'yAxisMin',
          type: 'number',
          value: _.get(styleConfig, 'yAxis.min', 0),
          onChange(v){
            updateFn('yAxis.min', () => v)
          }
        }),
        new StyleItem({
          title: '间隔大小',
          name: 'yAxisInterval',
          type: 'number',
          value: _.get(styleConfig, 'yAxis.interval', 0),
          onChange(v){
            updateFn('yAxis.interval', () => v)
          }
        })

      ]
    })
  }
}

export default commonStyleItem
