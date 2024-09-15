import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import InstitutionsPick from './Institutions-pick'
import { Select, Row, Col } from 'antd'
// import * as actions from '../../../actions/users'
// import { connect } from 'react-redux'
// import { bindActionCreators } from 'redux'

// @connect(state => _.pick(state.common, ['users']), dispatch => bindActionCreators(actions, dispatch))
export default class ExamineUserPick extends PureComponent {

  state = {
    selectIns: {},
    searchKey: ''
  }

  componentDidMount() {
    const { value = '', users = [] } = this.props
    const selectIns = (users.find(p => p.id === value) || {}).institutions_id
    this.setState({ selectIns })
    // this.props.getUsers()
  }

  render() {
    const { value = '', onChange, users = [] } = this.props
    const { selectIns, searchKey } = this.state
    const data = selectIns ? users.filter(p => p.institutions_id === selectIns) : users
    return (
      <div>
        <Row>
          <Col span={5}>机构名称:&nbsp;&nbsp;</Col>
          <Col span={19}>
            <InstitutionsPick className="width-100" value={selectIns} onChange={v => this.setState({ selectIns: v })} />
          </Col>
        </Row>
        <Row>
          <Col span={5}>选择用户:&nbsp;&nbsp;</Col>
          <Col span={19}>
            <Select value={value} onChange={onChange} mode="multiple" onSearch={val => this.setState({searchKey: val})}>
              {
                (searchKey ? data.filter(p => _.includes(p.first_name, searchKey)) : data).map(p => {
                  return <Select.Option key={p.id} value={p.id}>{p.first_name}</Select.Option>
                })
              }
            </Select>
          </Col>
        </Row>
      </div>
    )
  }
}

ExamineUserPick.propTypes = {
  users: PropTypes.array,
  value: PropTypes.any,
  onChange: PropTypes.func
}
