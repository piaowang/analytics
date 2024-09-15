import {Link} from 'react-router'
import { Icon as LegacyIcon } from '@ant-design/compatible';
import {Button} from 'antd'

export default function AddBtn(props) {
  let {to, title, className = '', type = 'ghost', icon = 'arrow-left'} = props
  return (
    <Link to={to}>
      <Button
        type={type}
        className={className}
        icon={<LegacyIcon type={icon} />}
      >
        {title}
      </Button>
    </Link>
  );
}
