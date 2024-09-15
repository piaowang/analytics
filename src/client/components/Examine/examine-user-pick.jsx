import React, { Component } from 'react'
import InstitutionsPick from '../Institutions/Institutions-pick'
import { Select } from 'antd'
import * as actions from '../../actions/users'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'

@connect(state => _.pick(state.common, ['users']), dispatch => bindActionCreators(actions, dispatch))
export default class ExamineUserPick extends Component {

  state = {
    selectIns: ''
  }

  componentDidMount() {
    const { value = '', users = [] } = this.props
    const selectIns = (users.find(p => p.id === value) || {}).institutions_id
    this.setState({ selectIns })
    this.props.getUsers()
  }

  render() {
    const { value = '', onChange, users = [], getPopupContainer } = this.props
    const { selectIns } = this.state
    const data = users.filter(p => p.institutions_id === selectIns)
    return (
      <div>
        <InstitutionsPick className="width-100" allowClear={true} value={selectIns} getPopupContainer={getPopupContainer} onChange={v => this.setState({ selectIns: v })} />
        <Select value={value} onChange={onChange} getPopupContainer={getPopupContainer}>
          {
            data.map(p => {
              return <Select.Option key={p.id} value={p.id}>{p.first_name}</Select.Option>
            })
          }
        </Select>
      </div>
    )
  }
}
