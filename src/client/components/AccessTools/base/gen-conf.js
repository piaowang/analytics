/**
 * Created on 27/04/2017.
 */
import { Input, Popconfirm } from 'antd'

function dateFormatTipsWrapper (children, placement = 'right') {
  return (
    <Popconfirm
      placement={placement}
      title={(
        <div>
          <p className="pd2b">日期内容与格式对应关系</p>
          <p>2017-01-01 00:00:00: yyyy-MM-dd HH:mm:ss</p>
          <p>2017-01-01: yyyy-MM-dd</p>
          <p>2017-01: yyyy-MM</p>
          <p>2017: yyyy</p>
          <p>2017-01-18T14:23:43.310Z: iso</p>
          <p>从1970年1月1日开始所经过的秒数（10位的数字）: posix</p>
          <p>从1970年1月1日开始所经过的毫秒数（13位数字）: millis</p>
        </div>
      )}
    >
      {children}
    </Popconfirm>
  )
}


/**
 * 向对象赋值时，将值传入ConfSet，使用该函数返回的值赋值给对象
 * @callback ConfSet
 * @param {ConfItem} record
 * @param {Array.<ConfItem>} list
 * @param {*} value
 * @param {Ot} ot
 * @return {*}
 */

/**
 * 从对象中取值时，将值传入ConfGet，使用该函数的返回值作为结果值
 * @callback ConfGet
 * @param {*} value
 * @return {*}
 */

/**
 * 生成表单中单个配置的元素
 * @callback getCsvConfElement
 * @param {ConfItem} record
 * @param {ConfItem | undefined} parent
 * @param {Object} props
 * @prams {Object} state
 * @return {React.Element}
 */

/**
 * 获取表单元素验证配置
 * @callback getCsvConfFieldOptions
 * @param {*} initialValue
 * @return {object}
 */

/**
 * @typedef {Object} ConfItem
 * @property {string} label
 * @property {string} path
 * @property {string} key
 * @property {boolean} visible
 * @property {ConfSet} set
 * @property {ConfGet} get
 * @property {getCsvConfElement} element
 * @property {getCsvConfFieldOptions} getFieldOptions
 * @property {Array.<ConfItem> | undefined} children
 */
const ConfItem = {
  label: '',
  path: '',
  key: '',
  visible: false,
  set(record, list, value){return record.get(value)},
  get(value){return value},
  element(record, parent, props, state){
    const { ot } = state
    const { form: { getFieldDecorator } } = props
    const key = parent ? `${parent.key}.${record.path}` : record.key
    const path = parent ? `${parent.path}.${record.path}` : record.path

    return getFieldDecorator(
      key,
      record.getFieldOptions(record.get(ot.get(path)))
    )(
      <Input
        type="default"
        placeholder={parent ? record.label : ''}
      />
    )
  },
  getFieldOptions(initialValue){
    return {
      rules: [
        { type: 'string', message: '该字段数据为字符类型' },
        { required: true, message: '必填项' }
      ],
      initialValue
    }
  }
}

/**
 * 扩展 ConfItem 到一个对象上
 * @param {ConfItem} r
 * @return {ConfItem}
 */
function extend (r) {
  let ret = { ...ConfItem, ...r }
  if (r.children) {
    ret = {
      ...ret,
      children: r.children.map(c => ({ ...ConfItem, ...c }))
    }
  }
  return ret
}

/**
 * 创建 ConfItem
 * @param {Array.<ConfItem | Object>} list
 * @return {Array.<ConfItem>}
 */
function create (list) {
  return list.map(extend)
}

export {
  extend,
  create,
  dateFormatTipsWrapper
}
