import { Link } from 'react-router'
import { PlusCircleOutlined } from '@ant-design/icons'
import { Button } from 'antd'

export default function AddBtn(props) {
  return props.companys.length
    ? <Link to="/console/company/new">
      <Button type="primary">
        <PlusCircleOutlined />
        新建企业
      </Button>
    </Link>
    : null
}
