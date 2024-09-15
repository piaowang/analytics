import {Link} from 'react-router'
import {Tooltip} from 'antd'
import _ from 'lodash'
import Icon from '../Common/sugo-icon'
import {ContextNameEnum, withContextConsumer} from '../../common/context-helper'
import {getOpenSliceUrl} from '../Slice/slice-helper'

function SliceList0(props) {
  let {
    slice,
    currentDashboard,
    removeSliceFromDashboard,
    addSliceToDashboard,
    showProjectName,
    projectList
  } = props
  let icon
  let {slice_name, id} = slice
  if (_.find(currentDashboard.slices, {id})) {
    icon = (
      <Tooltip title="从当前看板移除" >
        <Icon
          className="pointer slice-op"
          type="minus"
          onClick={() => removeSliceFromDashboard(slice)}
        />
      </Tooltip>
    )
  } else {
    icon = (
      <Tooltip title={'添加"' + slice_name + '"到当前数据看板'} >
        <Icon
          className="pointer slice-op"
          type="plus"
          onClick={() => addSliceToDashboard(slice)}
        />
      </Tooltip>
    )
  }

  return (
    <div
      className="slice-unit"
      data-id={id}
    >
      <h3 className="fix">
        <Tooltip title={slice_name}>
          <span className="fleft elli">
            <Link to={getOpenSliceUrl(slice)}>
              <span className="iblock mg1r slice-name elli">
                {slice_name}
              </span>
            </Link>
          </span>
        </Tooltip>
        <span className="slice-unit-icon-wrap">
          {icon}
        </span>
      </h3>

      {!showProjectName ? null : (
        <div className="elli">{_(projectList).chain().find(p => p.datasource_id === slice.druid_datasource_id).get('name').value()}</div>
      )}
    </div>
  )

}

const SliceList = withContextConsumer(ContextNameEnum.ProjectInfo)(SliceList0)

export default SliceList
