import React from 'react'
import Bread from '../Common/bread'
import { RollbackOutlined } from '@ant-design/icons';
import { Tabs, Button } from 'antd'
import Fetch from '../../common/fetch-final'
import Personal from './profile-personal'
import PassChange from './profile-password'
import { browserHistory } from 'react-router'

const {TabPane} = Tabs

export function updateProfile (user) {
  return Fetch.post('/app/user/update-profile', {user})
}

export default function Profile () {
  return (
    <div className="height-100 bg-white">
      <Bread
        path={[
          { name: '个人信息' }
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
          <Tabs type="card">
            <TabPane tab="个人信息" key="profile">
              <Personal />
            </TabPane>
            <TabPane tab="修改密码" key="change-password">
              <PassChange />
            </TabPane>
          </Tabs>

        </div>
      </div>
    </div>
  );

}

