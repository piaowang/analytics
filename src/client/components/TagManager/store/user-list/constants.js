/**
 * @Author sugo.io<asd>
 * @Date 17-9-26
 */

/**
 * 页面展示状态
 */
const VIEW_STATE = {
  LIST: 0,
  GALLERY: 1,
  TAGS: 2,
  ENTIRE_GALLERY: 3,
  TAG_COMPARE: 4 //智能画像
}

/**
 * 视图类型
 * @type {{TAGS: number, NORMAL: number}}
 */
const VIEW_TYPE = {
  TAGS: 0,    // 带标签过滤
  NORMAL: 1   // 普通状态
}

export {
  VIEW_STATE,
  VIEW_TYPE
}
