import React from 'react'
import Bread from '../Common/bread'
import UsergroupForm from './usergroup-form'
import { browserHistory } from 'react-router'
import { RollbackOutlined } from '@ant-design/icons';
import { Button } from 'antd'

export default class UsergroupNew extends React.PureComponent {
  render () {
    return (
      <div className="height-100">
        <Bread
          path={[
            { name: '用户分群列表', link: '/console/usergroup' },
            { name: '新建用户分群', link: '/console/usergroup/new' }
          ]}
        >
          <Button
            icon={<RollbackOutlined />}
            className="mg1l"
            onClick={() => browserHistory.push('/console/usergroup')}
          >
            返回
          </Button>
        </Bread>
        <div className="scroll-content-100 always-display-scrollbar">
          <UsergroupForm {...this.props} />
        </div>
      </div>
    );
  }
}
