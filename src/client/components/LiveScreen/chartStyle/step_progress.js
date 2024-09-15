import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'

export const defaultStepInfo = {
  metricName: '',
  title: '必保',
  titleColor: '#7689C0',
  titleFontSize: 14,
  compareTemplate: '${v < 0 ? "欠" : "超"} ${Math.abs(v)}',
  compareColor: '#D5DCF1',
  compareFontSize: 14,
  compareLineHeight: 32,
  pinLineColor: '#7689C0',
  compareLineColor: '#7689C0',
  notFullDotColor: '#58D6FD',
  fullDotColor: '#646BFA',
  dotSize: 8
}

export default function getStepProgress(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      progressColor: '#5C65F0',
      progressBgColor: '#384773',
      progressHeight: '50%',
      progressPadding: '0%',
      progressMetricName: '',
      progressWidth: 4,
      progressDotSize: 12,
      progressDotColor: '#646BFA',
      iconType: 'antd',
      iconSrc: 'caret-right',
      progressPinLineWidth: 2,
      pinLineWidth: 1,
      compareLineWidth: 1,
      stepInfos: []
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '基本配置',
      name: 'basic',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '进度前景色',
          name: 'progressColor',
          type: 'color',
          value: _.get(styleConfig, 'progressColor', '#fff'),
          onChange(v) {
            updateFn('progressColor', () => v)
          }
        }),
        new StyleItem({
          title: '进度背景色',
          name: 'progressBgColor',
          type: 'color',
          value: _.get(styleConfig, 'progressBgColor', '#fff'),
          onChange(v){
            updateFn('progressBgColor', () => v)
          }
        }),
        new StyleItem({
          title: '进度条高度',
          name: 'progressHeight',
          type: 'slider',
          min: 1,
          max: 100,
          step: 1,
          value: parseFloat(_.get(styleConfig, 'progressHeight', '50%')),
          onChange(v) {
            updateFn('progressHeight', () => `${v}%`)
          }
        }),
        new StyleItem({
          title: '内边距比例',
          name: 'progressPadding',
          type: 'slider',
          min: 0,
          max: 49,
          step: 1,
          value: parseFloat(_.get(styleConfig, 'progressPadding', '0%')),
          onChange(v) {
            updateFn('progressPadding', () => `${v}%`)
          }
        }),
        new StyleItem({
          title: '进度条粗细(px)',
          type: 'number',
          name: 'progressWidth',
          min: 1,
          value: _.get(styleConfig, 'progressWidth', 4),
          onChange(v){
            updateFn('progressWidth', () => v)
          }
        }),
        new StyleItem({
          title: '进度点的背景色',
          name: 'progressDotColor',
          type: 'color',
          value: _.get(styleConfig, 'progressDotColor', '#646BFA'),
          onChange(v){
            updateFn('progressDotColor', () => v)
          }
        }),
        new StyleItem({
          title: '进度点的大小(px)',
          type: 'number',
          name: 'progressDotSize',
          min: 1,
          value: _.get(styleConfig, 'progressDotSize', 12),
          onChange(v){
            updateFn('progressDotSize', () => v)
          }
        }),
        new StyleItem({
          title: '进度点图标类型',
          name: 'iconType',
          type: 'select',
          options: [
            { key: 'antd', value: 'antd 图标' },
            { key: 'dataUrl', value: '自定义小图标' }
          ],
          value: _.get(styleConfig, 'iconType'),
          onChange(v){
            updateFn('iconType', () => v)
          }
        }),
        _.get(styleConfig, 'iconType') === 'antd' ? (
          new StyleItem({
            title: '进度点图标名称',
            name: 'iconSrc',
            type: 'input',
            value: _.get(styleConfig, 'iconSrc'),
            onChange(ev){
              let {value} = ev.target
              updateFn('iconSrc', () => value)
            }
          })
        ) : (
          new StyleItem({
            title: '上传进度点小图标',
            name: 'iconSrc',
            type: 'fileToDataUrl',
            value: _.get(styleConfig, 'iconSrc') + '',
            onChange(v){
              updateFn('iconSrc', () => v)
            }
          })
        ),
        new StyleItem({
          title: '进度点指针粗细(px)',
          type: 'number',
          name: 'progressPinLineWidth',
          min: 1,
          value: _.get(styleConfig, 'progressPinLineWidth', 2),
          onChange(v){
            updateFn('progressPinLineWidth', () => v)
          }
        }),
        new StyleItem({
          title: '阶梯点指针粗细(px)',
          type: 'number',
          name: 'pinLineWidth',
          min: 1,
          value: _.get(styleConfig, 'pinLineWidth', 1),
          onChange(v){
            updateFn('pinLineWidth', () => v)
          }
        }),
        new StyleItem({
          title: '对比线粗细(px)',
          type: 'number',
          name: 'compareLineWidth',
          min: 1,
          value: _.get(styleConfig, 'compareLineWidth', 1),
          onChange(v){
            updateFn('compareLineWidth', () => v)
          }
        }),
        new StyleItem({
          title: '进度指标',
          name: 'progressMetricName',
          type: 'metric_picker',
          value: _.get(styleConfig, 'progressMetricName', ''),
          onChange(value){
            updateFn('progressMetricName', () => value)
          }
        })
      ]
    }),
    new StyleItem({
      title: '阶梯配置',
      name: 'stepInfos',
      type: 'editorGroup',
      items: [
        ..._.map(_.get(styleConfig, 'stepInfos', []), (popInfo, idx) => {
          return new StyleItem({
            title: `阶梯配置${idx + 1}`,
            name: `step-${idx}`,
            type: 'step_progress',
            className: 0 < idx ? 'bordert' : undefined,
            onRemove: () => {
              updateFn('stepInfos', prev => _.filter(prev, (v, i) => i !== idx))
            },
            value: popInfo,
            onChange(next) {
              updateFn(`stepInfos[${idx}]`, () => next)
            }
          })
        }),
        new StyleItem({
          title: '添加选项',
          name: 'appendBtn',
          type: 'button',
          children: '添加阶梯',
          onClick: () => {
            const defVal = defaultStepInfo
  
            updateFn('stepInfos', prev => [...(prev || []), defVal])
          }
        })
      ]
    })
  ]
}
