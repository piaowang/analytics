import StyleItem from '../models/styleItem'
import _ from 'lodash'
import { dbMetricAdapter } from '../../../../common/temp-metric.js'
import { immutateUpdate, remove } from '../../../../common/sugo-utils'

export default function getRichTextListStyleConfig(styleConfig, updateFn, dimensions, metrics, tempMetricDict, measureList, accessData) {
  
  tempMetricDict=_.isEmpty(tempMetricDict) ? {} : tempMetricDict
  metrics=_.isEmpty(metrics) ? [] : metrics
  accessData=_.isEmpty(accessData) ? [] : JSON.parse(accessData)
  let newMeasureList = (measureList || []).filter(item => _.includes(metrics, item.name))
  let newTempMetricDict = _.concat(newMeasureList,...dbMetricAdapter(tempMetricDict))

  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      pageSize: 2,
      htmlTemplate: '<p><span style="font-size:16px"><span style="color:#ffffff">${y1} </span></span>  <span style="font-size:14px"><span style="color:#cccccc">${y2}</span></span></p><p><span style="font-size:14px"><span style="color:#07a9fe">${y1}年底预估不达标.建议关注</span></span></p>',
      parameters:[],
      parametersWarning: [],
      vertical: false,
      autoplay: false,
      dots: true
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
          title: '显示面板指示点',
          name: 'dots',
          type: 'checkbox',
          checked: _.get(styleConfig, 'dots', true),
          onChange: (e) => {
            const checked = e.target.checked
            updateFn('dots', () => checked)
          }
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
    }),
    new StyleItem({
      title: '达标参数（y1:指标名称，y2:时间，y3:路径）',
      name: 'parameters',
      type: 'editorGroup',
      addable: true,
      onAdd: function(e) {
        e.stopPropagation()
        updateFn('parameters', prev => [...(prev || []), {}])
      },
      items:(styleConfig.parameters || []).map((parameter, i) => {
        return new StyleItem({
          title: `y${i+4}`,
          name: `parameters${i}`,
          type: 'input',
          value: parameter[`y${i+4}`],
          deletable: true,
          onDelete() {
            updateFn('parameters', prev => remove(prev, i))
          },
          onChange(e) {
            let { value } = e.target
            updateFn('parameters', prev => {
              return immutateUpdate(prev, i, () => ({...styleConfig.parameters[i],[`y${i+4}`]: value}))
            }
            )
          }
        })  
      }  
      )
    }),
    new StyleItem({
      title: '不达标参数（y1:指标名称，y2:时间，y3:路径）',
      name: 'parametersWarning',
      type: 'editorGroup',
      addable: true,
      onAdd: function(e) {
        e.stopPropagation()
        updateFn('parametersWarning', prev => [...(prev || []), {}])
      },
      items:(styleConfig.parametersWarning || []).map((parameterWarn, i) => {
        return new StyleItem({
          title: `y${i+4}`,
          name: `parameterWarn${i}`,
          type: 'input',
          value: parameterWarn[`y${i+4}`],
          deletable: true,
          onDelete() {
            updateFn('parametersWarning', prev => remove(prev, i))
          },
          onChange(e) {
            let { value } = e.target
            updateFn('parametersWarning', prev => {
              return immutateUpdate(prev, i, () => ({...styleConfig.parametersWarning[i],[`y${i+4}`]: value}))
            }
            )
          }
        })  
      }  
      )
    }),
    new StyleItem({
      title: '指标名称修改',
      name: 'indiName',
      type: 'editorGroup',
      items: [
        ...(newTempMetricDict.map(item => {
          return new StyleItem({
            title:item.title,
            name:item.title,
            type:'input',
            value: _.get(styleConfig, `richTextList.${item.title}`, ''),
            onChange: function (ev) {
              let {value} = ev.target
              updateFn(`richTextList.${item.title}`, () => value)
            }
          })
        }))  
      ]
    }),
    new StyleItem({
      title: '指标名称跳转路径',
      name: 'indiGo',
      type: 'editorGroup',
      items: [
        ...(newTempMetricDict.map(item => {
          return new StyleItem({
            title:item.title,
            name:item.title,
            type:'input',
            value: _.get(styleConfig, `richTextListSrc.${item.title}`, ''),
            onChange: function (ev) {
              let {value} = ev.target
              updateFn(`richTextListSrc.${item.title}`, () => value)
            }
          })
        }))  
      ]
    })
  ]
}
