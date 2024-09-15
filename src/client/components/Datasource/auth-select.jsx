import React from 'react'
import PropTypes from 'prop-types'
import { CheckCircleOutlined } from '@ant-design/icons';
import {Button} from 'antd'
import _ from 'lodash'
import {isEqualWithReactObj} from 'common/sugo-utils'

export default class AuthSelect extends React.Component {
  static propTypes = {
    dataSourceRoles: PropTypes.array.isRequired,
    roles: PropTypes.array.isRequired,
    onClick: PropTypes.func,
    record: PropTypes.object,
    title: PropTypes.string
  }

  shouldComponentUpdate(nextProps) {
    return !isEqualWithReactObj(this.props, nextProps)
  }

  render() {
    // 不能授权给没有数据源权限的角色
    const {roles, record: { role_ids }, onClick, dataSourceRoles, title = '角色'} = this.props
    const dataSourceRoleSet = dataSourceRoles && new Set(dataSourceRoles)
    return (
      <div>
        <p className="color-grey pd1b">{title}</p>
        <div className="pd1y">
          {
            roles.map((role, i) => {
              let {id, name, type} = role
              let isBuiltInRole = type === 'built-in'
              let selected = _.includes(role_ids, id)
              const disabled = dataSourceRoleSet ? !dataSourceRoleSet.has(role.id) : false
              return (
                <Button
                  type={selected || isBuiltInRole ? 'primary' : 'ghost'}
                  icon={<CheckCircleOutlined />}
                  disabled={disabled}
                  title={disabled ? `${name} 角色没有当前数据源权限` : name}
                  key={i + 'role' + role.id}
                  className="mg1r mg1b"
                  onClick={isBuiltInRole ? _.noop : () => onClick(role)}
                >{name}</Button>
              );
            })
          }
        </div>
      </div>
    );
  }
}
