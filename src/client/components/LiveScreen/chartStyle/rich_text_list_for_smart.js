import StyleItem from '../models/styleItem'
import _ from 'lodash'
import { dbMetricAdapter } from '../../../../common/temp-metric.js'
import { immutateUpdate, remove } from '../../../../common/sugo-utils'
import commonStyleItem from './common'

export default function getSmartRichTextListStyleConfig(styleConfig, updateFn, dimensions=[], metrics, tempMetricDict, measureList, accessData) {
  
  tempMetricDict=_.isEmpty(tempMetricDict) ? {} : tempMetricDict
  metrics=_.isEmpty(metrics) ? [] : metrics
  accessData=_.isEmpty(accessData) ? [] : JSON.parse(accessData)
  let newMeasureList = (measureList || []).filter(item => _.includes(metrics, item.name))
  let newTempMetricDict = _.concat(newMeasureList,...dbMetricAdapter(tempMetricDict))

  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      pageSize: 2,
      htmlTemplate: '<p><span style="font-size:16px"><span style="color:#ffffff">${y0} </span></span>  <span style="font-size:14px"><span style="color:#cccccc">${y1}</span></span></p>',
      vertical: false,
      autoplay: false,
      dots: true,
      sorting: 'default',
      showSrc: true,
      iconSrc: '',
      imgWidth: 32,
      imgHeight: 32,
      autoplaySpeed: 3000,
      layout: 'vertical',
      positionY: 0,
      positionX: 0,
      cellWidth: 120,
      imgSrc: 'default',
      link: 'default',
      target: 'inside'
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '基本配置',
      name: 'line_text',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '每页条数',
          name: 'pageSize',
          type: 'number',
          min: 1,
          value: _.get(styleConfig, 'pageSize', 2) + '',
          onChange(v){
            updateFn('pageSize', () => parseInt(v))
          }
        }),
        new StyleItem({
          title: '垂直轮播',
          name: 'vertical',
          type: 'checkbox',
          checked: _.get(styleConfig, 'vertical', false),
          onChange: (e) => {
            const checked = e.target.checked
            updateFn('vertical', () => checked)
          }
        }),
        new StyleItem({
          title: '自动轮播',
          name: 'autoplay',
          type: 'checkbox',
          checked: _.get(styleConfig, 'autoplay', false),
          onChange: (e) => {
            const checked = e.target.checked
            updateFn('autoplay', () => checked)
          }
        }),
        new StyleItem({
          title:'轮播时间',
          name:'autoplaySpeed',
          type:'number',
          min:1,
          value: _.get(styleConfig, 'autoplaySpeed', 3000),
          onChange: function (v) {
            updateFn('autoplaySpeed', () => v)
          }
        }),
        new StyleItem({
          title: '显示面板指示点',
          name: 'dots',
          type: 'checkbox',
          checked: _.get(styleConfig, 'dots', true),
          onChange: (e) => {
            const checked = e.target.checked
            updateFn('dots', () => checked)
          }
        }),
        !_.isEmpty(metrics) && new StyleItem({
          title: '排序',
          name: 'sorting',
          type: 'select',
          options: [
            { key: 'default', value: '默认' },
            { key: 'desc', value: '降序' },
            { key: 'asc', value: '升序' }
          ],
          value: _.get(styleConfig, 'sorting', 'default'),
          onChange(v) {
            updateFn('sorting', () => v)
          }
        }),
        new StyleItem({
          title: '布局',
          name: 'layout',
          type: 'select',
          options: [
            { key: 'vertical', value: '纵向' },
            { key: 'horizontal', value: '横向' }
          ],
          value: _.get(styleConfig, 'layout', 'vertical'),
          onChange(v) {
            updateFn('layout', () => v)
          }
        }),
        new StyleItem({
          title:'单元格宽度(px)',
          name:'cellWidth',
          min:0,
          type:'number',
          value: _.get(styleConfig, 'cellWidth', 120),
          onChange: function (v) {
            updateFn('cellWidth', () => v)
          }
        }),
        new StyleItem({
          title:'上间距(px)',
          name:'topSpacing',
          min:0,
          type:'number',
          value: _.get(styleConfig, 'topSpacing', 0),
          onChange: function (v) {
            updateFn('topSpacing', () => v)
          }
        }),
        new StyleItem({
          title: '显示图标',
          name: 'showSrc',
          type: 'checkbox',
          checked: _.get(styleConfig, 'showSrc', true),
          onChange: (e) => {
            const checked = e.target.checked
            updateFn('showSrc', () => checked)
          }
        }),
        !_.isEmpty(dimensions) ? new StyleItem({
          title: '设置图片src',
          name: 'imgSrc',
          type: 'select',
          options: [
            { key: 'default', value: '默认' },
            ...(dimensions.map((d, i) => {
              return { key: i + 1, value: d }
            }))
          ],
          value: _.get(styleConfig, 'imgSrc', 'default'),
          onChange(v) {
            updateFn('imgSrc', () => v)
          }
        }) : null,
        _.get(styleConfig, 'imgSrc', 'default') === 'default' ? new StyleItem({
          title: '上传小图标',
          name: 'iconSrc',
          type: 'fileToDataUrl',
          value: _.get(styleConfig, 'iconSrc') + '',
          onChange(v){
            updateFn('iconSrc', () => v)
          }
        }) : null,        
        new StyleItem(commonStyleItem.fontSize, {
          title: '图标宽度(px)',
          name: 'imgWidth',
          value: _.get(styleConfig, 'imgWidth', 32) + '',
          onChange(v){
            updateFn('imgWidth', () => parseInt(v))
          }
        }),
        new StyleItem(commonStyleItem.fontSize, {
          title: '图标高度(px)',
          name: 'imgHeight',
          value: _.get(styleConfig, 'imgHeight', 32) + '',
          onChange(v){
            updateFn('imgHeight', () => parseInt(v))
          }
        }),
        new StyleItem({
          title:'图标x位置(px)',
          name:'positionX',
          type:'number',
          value: _.get(styleConfig, 'positionX', 0),
          onChange: function (v) {
            updateFn('positionX', () => v)
          }
        }),
        new StyleItem({
          title:'图标y位置(px)',
          name:'positionY',
          type:'number',
          value: _.get(styleConfig, 'positionY', 0),
          onChange: function (v) {
            updateFn('positionY', () => v)
          }
        }),
        !_.isEmpty(dimensions) ? new StyleItem({
          title: '设置跳转链接',
          name: 'link',
          type: 'select',
          options: [
            { key: 'default', value: '默认' },
            ...(dimensions.map((d, i) => {
              return { key:  i + 1, value: d }
            }))
          ],
          value: _.get(styleConfig, 'link', 'default'),
          onChange(v) {
            updateFn('link', () => v)
          }
        }) : null,
        new StyleItem({
          title: '超链接目标',
          name: 'position',
          type: 'select',
          value: _.get(styleConfig, 'target', 'inside'),
          onChange(v) {
            updateFn('target', () => v)
          },
          options: [
            { key: 'inside', value: '当前窗口'},
            { key: 'outside', value: '新窗口'}
          ]
        }),
        new StyleItem({
          title: 'Html模板',
          name: 'htmlTemplate',
          type: 'braftEditor',
          value: _.get(styleConfig, 'htmlTemplate'),
          onChange(v){
            updateFn('htmlTemplate', () => v)
          }
        })
      ]
    })
  ]
}
