import moment from 'moment'
import _ from 'lodash'

export default function TagUpdateTime (props) {

  let datasourceName = _.get(props, 'datasourceCurrent.name')
  if (!datasourceName) {
    return null
  }
  const timeStr = datasourceName.split('_').pop()
  const maxTime = moment(timeStr).isValid() ? moment(timeStr).format('YYYY-MM-DD') : null
  return (
    <span className="iblock">
      {maxTime ? `标签更新时间: ${maxTime}` : null}
    </span>
  )

}
