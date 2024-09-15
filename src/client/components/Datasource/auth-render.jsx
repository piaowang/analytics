import React from 'react'
import _ from 'lodash'

export default class AuthRender extends React.Component {

  shouldComponentUpdate(nextProps) {
    return !_.isEqual(this.props, nextProps)
  }

  render() {
    let {roles, record} = this.props
    let {role_ids} = record
    let rs = _.uniq(role_ids).map(id => {
      let role = _.find(roles, {id}) || { name: '' }
      return role.name
    }).join(' ')
    return (
      <div className="wordbreak">
        <span className="color-grey mg1r bold">角色:</span>
        {rs}
      </div>
    )
  }
}

