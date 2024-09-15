import {checkPermission} from '../../common/permission-control'
import {Link} from 'react-router'
import { PlusCircleOutlined } from '@ant-design/icons'
import { Button } from 'antd'
let canAdd = checkPermission('/console/security/role/new')

export default function AddBtn(props) {
  return canAdd
    ? <Link to="/console/security/role/new">
      <Button type="primary">
        <PlusCircleOutlined />
        新建角色
      </Button>
    </Link>
    : null
}
