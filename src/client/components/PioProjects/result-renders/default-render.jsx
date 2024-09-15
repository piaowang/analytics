
import _ from 'lodash'

export default function (props) {
  let name = _.get(props, 'modelData.operator.fullName', '')
  return (
    <div>
      <b>{name}</b> 还没有结果渲染方法
    </div>
  )
}
