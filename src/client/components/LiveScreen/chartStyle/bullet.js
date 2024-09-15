import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'
import { dbMetricAdapter } from '../../../../common/temp-metric.js'

export default function getBullet(styleConfig, updateFn, dimensions, metrics, tempMetricDict, measureList, accessData) {
  tempMetricDict=_.isEmpty(tempMetricDict) ? {} : tempMetricDict
  metrics=_.isEmpty(metrics) ? [] : metrics
  accessData=_.isEmpty(accessData) ? [] : JSON.parse(accessData)
  let newMeasureList = (measureList || []).filter(item => _.includes(metrics, item.name))
  let newTempMetricDict =_.concat(newMeasureList,...dbMetricAdapter(tempMetricDict))
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
            width: 400,
            height: 34,
            lineHeight: '34px',
            textColor: '#7689C0',
            numColor: '#D5DCF1',
            background: '#070E22',
            fontSize: 12,
            fontFamily: 'Source Han Sans CN',
            bottom: 0
          },
          bulletStyle: {
            background: '#070e22',
            height: 24,
            width: '60%',
            containerLeft: 50
          },
          bulletContentStyle: {
            height: 14
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
        new StyleItem({
          title:'垂直位置',
          type: 'number',
          min: 0,
          name:'title-bottom',
          value: _.get(styleConfig, '_extra.option.titleStyle.bottom', 0) + '',
          onChange(v) {
            updateFn('_extra.option.titleStyle.bottom', () => parseInt(v))
          }
        }),
        new StyleItem({
          title:'宽度',
          type: 'number',
          min: 0,
          name:'titleWidth',
          value: _.get(styleConfig, '_extra.option.titleStyle.width', '60%') + '',
          onChange(v) {
            updateFn('_extra.option.titleStyle.width', () => parseInt(v))
          }
        }),
        new StyleItem({
          title: '高度',
          type: 'number',
          min: 0,
          name:'titleHeight',
          value: _.get(styleConfig, '_extra.option.titleStyle.height', 18) + '',
          onChange(v) {
            updateFn('_extra.option.titleStyle', (t) => ({...t, height: parseInt(v), lineHeight: `${parseInt(v)}px`}))
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title:'文字颜色',
          name:'titleTextcolor',
          value: _.get(styleConfig, '_extra.option.titleStyle.textColor', '#fff'),
          onChange(v) {
            updateFn('_extra.option.titleStyle.textColor', () => v)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title:'数字颜色',
          name:'titleNumcolor',
          value: _.get(styleConfig, '_extra.option.titleStyle.numColor', '#fff'),
          onChange(v) {
            updateFn('_extra.option.titleStyle.numColor', () => v)
          }
        }),
        new StyleItem(commonStyleItem.color, {
          title:'背景颜色',
          name:'title-background-color',
          value: _.get(styleConfig, '_extra.option.titleStyle.background', '#fff'),
          onChange(v) {
            updateFn('_extra.option.titleStyle.background', () => v)
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
      title: '子弹图',
      name: 'bullet',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '水平位置(%)',
          type: 'number',
          min: 0,
          name:'bulletHeight',
          value: _.get(styleConfig, '_extra.option.bulletStyle.containerLeft', 50),
          onChange(v) {
            updateFn('_extra.option.bulletStyle.containerLeft', () => v)
          }
        }),
        new StyleItem(commonStyleItem.color,{
          title: '背景颜色',
          name: 'bulletBackground',
          value: _.get(styleConfig, '_extra.option.bulletStyle.background', '#070e22'),
          onChange(v) {
            updateFn('_extra.option.bulletStyle.background', () => v)
          }
        }),
        new StyleItem({
          title:'背景宽度(%)',
          type: 'number',
          min: 0,
          name:'bulletWidth',
          value: _.get(styleConfig, '_extra.option.bulletStyle.width', '60%').split('%')[0],
          onChange(v) {
            updateFn('_extra.option.bulletStyle.width', () => v + '%')
          }
        }),
        new StyleItem({
          title: '背景高度(px)',
          type: 'number',
          min: 0,
          name:'bulletHeight',
          value: _.get(styleConfig, '_extra.option.bulletStyle.height', 24) + '',
          onChange(v) {
            updateFn('_extra.option.bulletStyle', (t) => ({...t, height: parseInt(v), lineHeight: `${parseInt(v)}px`}))
          }
        }),
        new StyleItem({
          title: '子弹高度(px)',
          type: 'number',
          min: 0,
          name:'bulletContentHeight',
          value: _.get(styleConfig, '_extra.option.bulletContentStyle.height', 14) + '',
          onChange(v) {
            updateFn('_extra.option.bulletContentStyle.height', () => parseInt(v))
          }
        })
      ]
    }),
    ...(newTempMetricDict.map(item =>  {
      return new StyleItem({
        title: item.title,
        name: item.title,
        type: 'editorGroup',
        items: [
          new StyleItem({
            title:'宽度',
            type: 'number',
            min: 0,
            name:'achieveWidth',
            value: _.get(styleConfig, `_extra.option.${item.title}.width`, 36) + '',
            onChange(v) {
              updateFn(`_extra.option.${item.title}.width`, () => parseInt(v))
            }
          }),
          new StyleItem({
            title: '高度',
            type: 'number',
            min: 0,
            name:'achieveHeight',
            value: _.get(styleConfig, `_extra.option.${item.title}.height`, 36) + '',
            onChange(v) {
              updateFn(`_extra.option.${item.title}`, (t) => ({...t, height: parseInt(v), lineHeight: `${parseInt(v)}px`}))
            }
          }),
          new StyleItem(commonStyleItem.color, {
            name: 'achieveColor',
            value: _.get(styleConfig, `_extra.option.${item.title}.color`, '#fff'),
            onChange(v) {
              updateFn(`_extra.option.${item.title}.color`, () => v)
            }
          }),
          new StyleItem(commonStyleItem.color, {
            name: 'achieveBackground',
            title: '背景颜色',
            value: _.get(styleConfig, `_extra.option.${item.title}.background`, '#fff'),
            onChange(v) {
              updateFn(`_extra.option.${item.title}.background`, () => v)
            }
          }),
          new StyleItem(commonStyleItem.fontSize, {
            name: 'achieveFontSize',
            value: _.get(styleConfig, `_extra.option.${item.title}.fontSize`, 12) + '',
            onChange(v) {
              updateFn(`_extra.option.${item.title}.fontSize`, () => parseInt(v))
            }
          }),
          new StyleItem(commonStyleItem.fontFamily, {
            name: 'achieveFontFamily',          
            value: _.get(styleConfig, `_extra.option.${item.title}.fontFamily`, 'Microsoft Yahei'),
            onChange(v) {
              updateFn(`_extra.option.${item.title}.fontFamily`, () => v)
            }
          }),
          new StyleItem({
            title: '重命名',
            name: 'achieveChangName',
            type: 'input',
            value: _.get(styleConfig, `_extra.option.${item.title}.changName`, ''),
            onChange(e) {
              updateFn(`_extra.option.${item.title}.changName`, () => e.target.value)
            }
          }),
          new StyleItem(commonStyleItem.fontWeight, {
            name: 'achieveFontWeight',
            value: _.get(styleConfig, `_extra.option.${item.title}.fontWeight`, 'normal'),
            onChange(e) {
              var checked = e.target.checked
              updateFn(`_extra.option.${item.title}.fontWeight`, () => checked ? 'bold' : 'normal')
            }
          })
        ]
      })
    }))
  ]
}
