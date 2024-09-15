import {checkPermission} from '../../common/permission-control'
import { Link } from 'react-router'
import { PlusCircleOutlined } from '@ant-design/icons'
import { Button } from 'antd'
let canAdd = checkPermission('/console/segment-expand/new')

export default function AddBtn(props) {
  return canAdd && props.segmentExpands.length
    ? <Link to="/console/segment-expand/new">
      <Button type="primary">
        <PlusCircleOutlined />
        新建用户扩群
      </Button>
    </Link>
    : null
}
