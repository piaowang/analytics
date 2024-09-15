import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import { immutateUpdate, remove } from '../../../../common/sugo-utils'
import _ from 'lodash'

export default function getGauge(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      series: [{
        name: '外层',
        type: 'gauge',
        detail: null,
        radius: '70%',
        axisLine: {
          lineStyle: {
            width: 20,
            color: [
              [1, '#38B8FF']
            ]
          }
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: false
        },
        axisLabel: false
      }, {
        name: '分隔线',
        type: 'gauge',
        detail: null,
        radius: '60%',
        splitLine: {
          show: false
        },
        axisLine: {
          lineStyle: {
            show: false,
            width: 0,
            color: [
              [1, '#00C1DE']
            ]
          }
        },
        axisTick: {
          splitNumber: 10,
          lineStyle: {
            width: 2,
            color: '#D0D0D0'
          }
        },
        axisLabel: false
      }, {
        name: '指针',
        type: 'gauge',
        title: {
          show: true,
          fontSize: '12',
          color: '#00C1DE'
        },
        detail: {
          show: true,
          color: '#00C1DE',
          fontSize: '12',
          formatter: (v) => v.toFixed(2) + '%'
        },
        radius: '60%',
        itemStyle: {
          color: '#00C1DE'
        },
        axisLine: {
          lineStyle: {
            show: false,
            width: 0,
            color: [
              [1, '#00C1DE']
            ]
          }
        },
        splitLine: {
          show: false
        },
        axisLabel: {
          show: false
        }
      }, {
        name: '刻度',
        type: 'gauge',
        detail: null,
        radius: '60%',
        axisLine: {
          lineStyle: {
            show: false,
            width: 0,
            color: [
              [1, '#1FC8E2']
            ]
          }
        },
        splitLine: {
          length: 20,
          lineStyle: {
            width: 3,
            color: '#1FC8E2'
          }

        },
        axisTick: {
          show: false
        },
        axisLabel: {
          show: true,
          distance: 10,
          fontSize: '12',
          color: '#00C1DE'
        }
      }]
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  const option = {
    '外层': {
      value: (series) => series.axisLine.lineStyle.color[0][1],
      onChange: (i, color) => updateFn('series', prev => immutateUpdate(prev, `[${i}].axisLine.lineStyle.color[0][1]`, () => color))
    },
    '指针': {
      value: (series) => series.axisLine.lineStyle.color[0][1],
      onChange: (i, color) => updateFn('series', prev => immutateUpdate(prev, `[${i}].itemStyle.color`, () => color))
    },
    '刻度': {
      value: (series) => series.splitLine.lineStyle.color,
      onChange: (i, color) => updateFn('series', prev => immutateUpdate(prev, `[${i}].splitLine.lineStyle.color`, () => color))
    },
    '分隔线': {
      value: (series) => series.axisLine.lineStyle.color[0][1],
      onChange: (i, color) => updateFn('series', prev => immutateUpdate(prev, `[${i}].axisTick.lineStyle.color`, () => color))
    }
  }
  return [
    new StyleItem({
      title: '图形颜色',
      type: 'editorGroup',
      name: 'graphColor',
      addable: false,
      items: styleConfig.series.map((series, i) => new StyleItem(new StyleItem({
        title: '颜色',
        name: `fontColor${i}`,
        type: 'color'
        // type2: 'rgba',
      }), {
        title: `${series.name}颜色`,
        value: option[series.name].value(series),
        onChange: (color) => option[series.name].onChange(i, color)
      }))
    }),
    new StyleItem({
      title: '刻度标签',
      name: 'axisLabel',
      type: 'editorGroup',
      hidable: true,
      checked: _.get(styleConfig, 'series[3].axisLabel.show', true),
      onChangeVisible: function (e) {
        e.stopPropagation()
        const checked = e.target.checked
        updateFn('series[3].axisLabel.show', () => checked)
      },
      items: [
        new StyleItem({
          title: '文字颜色',
          name: 'axisLabel-color',
          type: 'color',
          value: _.get(styleConfig, 'series[3].axisLabel.color', '#00C1DE'),
          onChange(v) {
            updateFn('series[3].axisLabel.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontSize, {
          value: _.get(styleConfig, 'series[0].label.normal.textStyle.fontSize', '12') + '',
          onChange: function (fontSize) {
            updateFn('series[3].axisLabel.fontSize', () => ~~fontSize)
          }
        })
      ]
    }),
    new StyleItem({
      title: '仪表盘详情',
      name: 'detail',
      type: 'editorGroup',
      hidable: true,
      checked: _.get(styleConfig, 'series[2].detail.show', true),
      onChangeVisible: function (e) {
        e.stopPropagation()
        const checked = e.target.checked
        updateFn('series[2].detail.show', () => checked)
      },
      items: [
        new StyleItem({
          title: '文字颜色',
          name: 'detail-color',
          type: 'color',
          value: _.get(styleConfig, 'series[2].detail.color', '#00C1DE'),
          onChange(v) {
            updateFn('series[2].detail.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontSize, {
          value: _.get(styleConfig, 'series[2].detail.fontSize.', '12') + '',
          onChange: function (fontSize) {
            updateFn('series[2].detail.fontSize', () => ~~fontSize)
          }
        })
      ]
    }),
    new StyleItem({
      title: '仪表盘标题',
      name: 'gauge-title',
      type: 'editorGroup',
      hidable: true,
      checked: _.get(styleConfig, 'series[2].title.show', true),
      onChangeVisible: function (e) {
        e.stopPropagation()
        const checked = e.target.checked
        updateFn('series[2].title.show', () => checked)
      },
      items: [
        new StyleItem({
          title: '文字颜色',
          name: 'title-color',
          type: 'color',
          value: _.get(styleConfig, 'series[2].title.color', '#00C1DE'),
          onChange(v) {
            updateFn('series[2].title.color', () => v)
          }
        }),
        new StyleItem(commonStyleItem.fontSize, {
          value: _.get(styleConfig, 'series[2].title.fontSize.', '12') + '',
          onChange: function (fontSize) {
            updateFn('series[2].title.fontSize', () => ~~fontSize)
          }
        })
      ]
    })
  ]
}
