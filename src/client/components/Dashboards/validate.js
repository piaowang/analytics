import {message} from 'antd'

export default function validate(target) {

  target.prototype.validate = function () {
    let dashb = this.props.currentDashboard
    if (!dashb.slices.length) {
      message.error(
        '请至少选择一个单图', 8
      )
      return false
    } else if (!dashb.dashboard_title) {
      message.error(
        '标题不能为空', 8
      )
    } else return true
  }

}
