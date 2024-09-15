import commonStyleItem from './common'
import StyleItem from '../models/styleItem'
import _ from 'lodash'

export default function getDropDownPopoverStyleItem(styleConfig, updateFn) {
  if (_.isEmpty(styleConfig)) {
    const defaultStyle = {
      color: '#8298D8',
      size: 32,
      fontWeight: 'normal',
      rotate: 90,
      iconType: 'antd', // antd | dataUrl
      iconSrc: 'ellipsis',
      fontSize: 12,
      modalWidth: '61vw',
      modalHeight: '61vh',
      modelCloseColor: '#8298D8',
      modelCloseSize: 14,
      popovers: [] // {iconType, iconSrc, title, url, target}
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
        })
      ]
    }),
    new StyleItem({
      title: '选项设置',
      name: 'popovers',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '文字大小(px)',
          name: 'fontSize',
          type: 'number',
          min: 10,
          max: 100,
          value: _.get(styleConfig, 'fontSize', 12) + '',
          onChange(v){
            updateFn('fontSize', () => parseInt(v))
          }
        }),
        new StyleItem({
          title: '弹出框宽度',
          name: 'modalWidth',
          type: 'input',
          value: _.get(styleConfig, 'modalWidth', '61vw'),
          onChange(ev){
            const {value} = ev.target
            updateFn('modalWidth', () => +value ? `${value}px` : value)
          }
        }),
        new StyleItem({
          title: '弹出框高度',
          name: 'modalHeight',
          type: 'input',
          value: _.get(styleConfig, 'modalHeight', '61vh'),
          onChange(ev){
            const {value} = ev.target
            updateFn('modalHeight', () => +value ? `${value}px` : value)
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
        }),
        ..._.map(_.get(styleConfig, 'popovers', []), (popInfo, idx) => {
          return new StyleItem({
            title: `选项配置${idx + 1}`,
            name: `link-${idx}`,
            type: 'link',
            className: 'bordert',
            onRemove: () => {
              updateFn('popovers', prev => _.filter(prev, (v, i) => i !== idx))
            },
            value: popInfo,
            onChange(next) {
              updateFn(`popovers[${idx}]`, () => next)
            }
          })
        }),
        new StyleItem({
          title: '添加选项',
          name: 'appendBtn',
          type: 'button',
          children: '添加选项',
          onClick: () => {
            const defVal = {iconType: 'dataUrl', iconSrc: '', title: '', url: '', target: '_blank'}
            updateFn('popovers', prev => [...(prev || []), defVal])
          }
        })
      ]
    })
  ]
}
