/**
 * @Author sugo.io<asd>
 * @Date 17-9-29
 */

/**
 * 提取标签类别与标签名
 * @param {string} tag
 * @return {{group:string, tag:string}}
 * @example
 * ```js
 * extract_tag('a_b') // {group:'a', tag: 'a'}
 * ```
 */
function extract_tag (tag) {
  const arr = /^([^_]+)(?:_)(.+$)/.exec(tag) || [null, null, null]
  return {
    group: arr[1],
    tag: arr[2]
  }
}

export {
  extract_tag
}
