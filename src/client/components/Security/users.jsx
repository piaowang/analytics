import React from 'react'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import * as actions from '../../actions'
import Bread from '../Common/bread'
import UsersTable from './users-table'
import _ from 'lodash'
import './user.styl'
import { QuestionCircleOutlined } from '@ant-design/icons'
import { Popover } from 'antd'

class Users extends React.Component {

  componentDidMount() {
    this.props.getUsers()
    this.props.getRoles()
    this.props.getInstitutions()
  }

  render() {
    let help = (<div>
      <p>用户管理可以管理平台的用户和自由分配不同</p>
      <p>用户的使用权限，从而保障高度的数据安全的</p>
      <p>同时，帮助企业内部人员实现更好的协作。</p>
    </div>)
    let extra = (
      <Popover content={help} trigger="hover" placement="bottomLeft">
        <QuestionCircleOutlined className="font14" />
      </Popover>
    )

    return (
      <div className="height-100 bg-white">
        <Bread
          path={[
            { name: '用户管理' }
          ]}
          extra={extra}
        />
        <div className="scroll-content">
          <UsersTable {...this.props} />
        </div>
      </div>
    )
  }
}

let mapStateToProps = state => {
  return {
    ..._.pick(state.common, ['roles', 'users', 'usersDraft','loading'])
  }
}
let mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

export default connect(mapStateToProps, mapDispatchToProps)(Users)
