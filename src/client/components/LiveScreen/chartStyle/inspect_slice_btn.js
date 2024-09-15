import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'

export default function getInspectSliceBtnStyleConfig(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      color: '#8298D8',
      size: 32,
      fontWeight: 'normal',
      rotate: 0,
      iconType: 'antd', // antd | dataUrl
      iconSrc: 'arrows-alt',
      modalWidth: '61vw',
      modalHeight: '61vh',
      modelCloseColor: '#8298D8',
      modelCloseSize: 14,
      visibleOn: 'always', // always | hoverSomeComponent | hoverTargetComponent
      candidateHoverComponentId: '',
      targetComponentId: ''
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '基本样式',
      name: 'basic',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '图标类型',
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
            title: '图标名称',
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
            title: '上传小图标',
            name: 'iconSrc',
            type: 'fileToDataUrl',
            value: _.get(styleConfig, 'iconSrc') + '',
            onChange(v){
              updateFn('iconSrc', () => v)
            }
          })
        ),
        _.get(styleConfig, 'iconType') !== 'antd'
          ? null
          : (
            new StyleItem(commonStyleItem.color, {
              value: _.get(styleConfig, 'color', '#fff'),
              onChange(v){
                updateFn('color', () => v)
              }
            })
          ),
        new StyleItem({
          title: '大小(px)',
          name: 'size',
          type: 'number',
          min: 12,
          max: 100,
          value: _.get(styleConfig, 'size', 32) + '',
          onChange(v){
            updateFn('size', () => parseInt(v))
          }
        }),
        _.get(styleConfig, 'iconType') !== 'antd' ? null : (
          new StyleItem(commonStyleItem.fontWeight, {
            checked: _.get(styleConfig, 'fontWeight', 'normal') === 'bold',
            onChange(e){
              var checked = e.target.checked
              updateFn('fontWeight', () => checked ? 'bold' : 'normal')
            }
          })
        ),
        new StyleItem({
          title: '旋转（角度）',
          name: 'rotate',
          type: 'number',
          value: _.get(styleConfig, 'rotate', 0) + '',
          onChange(v){
            updateFn('rotate', () => +v)
          }
        }),
        new StyleItem({
          title: '弹出框宽度',
          name: 'modalWidth',
          type: 'input',
          value: _.get(styleConfig, 'modalWidth', '61vw'),
          onChange(ev){
            const {value} = ev.target
            updateFn('modalWidth', () => value)
          }
        }),
        new StyleItem({
          title: '弹出框高度',
          name: 'modalHeight',
          type: 'input',
          value: _.get(styleConfig, 'modalHeight', '61vh'),
          onChange(ev){
            const {value} = ev.target
            updateFn('modalHeight', () => value)
          }
        }),
        new StyleItem({
          title: '弹出框关闭按钮颜色',
          name: 'modelCloseColor',
          type: 'color',
          value: _.get(styleConfig, 'modelCloseColor', '#8298D8'),
          onChange(v){
            updateFn('modelCloseColor', () => v)
          }
        }),
        new StyleItem({
          title: '弹出框关闭按钮大小(px)',
          name: 'modelCloseSize',
          type: 'number',
          min: 12,
          max: 100,
          value: _.get(styleConfig, 'modelCloseSize', 14) + '',
          onChange(v){
            updateFn('modelCloseSize', () => parseInt(v))
          }
        })
      ]
    }),
    new StyleItem({
      title: '逻辑设置',
      name: 'popovers',
      type: 'editorGroup',
      items: [
/*
        new StyleItem({
          title: '可见性',
          name: 'visibleOn',
          type: 'select',
          options: [
            { key: 'always', value: '总是可见' },
            { key: 'hoverSomeComponent', value: '悬浮于某个控件' },
            { key: 'hoverTargetComponent', value: '悬浮于目标控件' }
          ],
          value: _.get(styleConfig, 'visibleOn'),
          onChange(v){
            updateFn('visibleOn', () => v)
          }
        }),
*/
        _.get(styleConfig, 'visibleOn') !== 'hoverSomeComponent'
          ? null
          : new StyleItem({
            title: '触发显示控件',
            name: 'candidateHoverComponentId',
            type: 'componentPicker',
            value: _.get(styleConfig, 'candidateHoverComponentId'),
            onChange(v){
              updateFn('candidateHoverComponentId', () => v)
            }
          }),
        new StyleItem({
          title: '目标控件',
          name: 'targetComponentId',
          type: 'componentPicker',
          value: _.get(styleConfig, 'targetComponentId'),
          onChange(v){
            updateFn('targetComponentId', () => v)
          }
        })
      ]
    })
  ]
}
