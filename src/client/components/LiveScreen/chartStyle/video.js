import StyleItem from '../models/styleItem'
import _ from 'lodash'

const {
  demoVideoSource = ''
} = window.sugo

export default function getVideo(styleConfig, updateFn) {
  if(_.isEmpty(styleConfig)) {
    const defaultStyle = {
      video_url: demoVideoSource,
      is_autoplay: true,
      is_loop: true,
      is_controls: true
    }
    updateFn && updateFn([], () => defaultStyle)
    return
  }
  return [
    new StyleItem({
      title: '基础样式',
      name: 'baseValue',
      type: 'editorGroup',
      items: [
        new StyleItem({
          title: '全屏',
          name: 'fullScreen',
          type: 'checkboxWithLabel',
          checked: _.get(styleConfig, 'isFullScreen', false),
          onChange(v) {
            updateFn('isFullScreen', () => v.target.checked)
          }
        }),
        new StyleItem({
          title: '自动播放',
          name: 'autoplay',
          type: 'checkboxWithLabel',
          checked: _.get(styleConfig, 'is_autoplay', true),
          onChange(v) {
            updateFn('is_autoplay', () => v.target.checked)
          }
        }),
        new StyleItem({
          title: '循环播放',
          name: 'loop',
          type: 'checkboxWithLabel',
          checked: _.get(styleConfig, 'is_loop', '100%'),
          onChange(v) {
            updateFn('is_loop', () => v.target.checked)
          }
        }),
        new StyleItem({
          title: '控制条',
          name: 'controls',
          type: 'checkboxWithLabel',
          checked: _.get(styleConfig, 'is_controls', '100%'),
          onChange(v) {
            updateFn('is_controls', () => v.target.checked)
          }
        })
      ]
    })
  ]
}
