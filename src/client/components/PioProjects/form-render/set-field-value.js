/**
 * 添加setFieldValue等方法，可以优化BasicInput的响应速度
 * target需要有state = { value: '' }
 * 当输入值发生改变时调用change方法，当需要提交输入值时，调用setFieldValue
 * constructor中最后必须调用init方法进行初始化
 */
import { getValue } from './contants'

export default function(target) {
  target.prototype.componentWillReceiveProps = function(nextProps) {
    const { param, keyToValueMap, getFieldId } = nextProps
    let id = getFieldId(param.key) //用于检查是否是不同算子
    let value = getValue(param, keyToValueMap)
    if(id !== this._id || (value && value !== this.state.value)) {
      this._id = id
      this.setState({value})      
    }
  }

  target.prototype.init = function(props) {
    const { param, keyToValueMap, getFieldId } = props
    this._id = getFieldId(param.key)
    this.state.value = getValue(param, keyToValueMap)
  }

  target.prototype.setFieldValue = function() {
    const { param, form } = this.props
    const { setFieldsValue } = form
    const key = this.props.getFieldId(param.key)
    setFieldsValue({[key]: this.state.value})
  }

  target.prototype.change = function(e) {
    let value = e && e.target ? e.target.value : e
    if('param_type_int' === this.props.param.paramType && value) {
      value = parseInt(value)
    }
    this.setState({value})
  }
}
