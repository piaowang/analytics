import Bread from '../Common/bread'
import CompanyForm from './company-form'
import { browserHistory } from 'react-router'
import { RollbackOutlined } from '@ant-design/icons';
import { Button } from 'antd'

export default function Profile () {
  return (
    <div className="height-100 bg-white">
      <Bread
        path={[
          { name: '企业信息' }
        ]}
      >
        <Button
          icon={<RollbackOutlined />}
          className="mg1l"
          onClick={() => browserHistory.goBack()}
        >
          返回
        </Button>
      </Bread>
      <div className="scroll-content">
        <div className="pd3">
          <CompanyForm />
        </div>
      </div>
    </div>
  );

}

