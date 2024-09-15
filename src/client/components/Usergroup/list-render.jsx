import React from 'react'
import { Link } from 'react-router'
import { Tooltip, Badge } from 'antd'
import Search from '../Common/search'

let countStyle = {
  background: '#aaa',
  color: '#fff',
  border: 'none'
}

export default class Uglist extends React.Component {

  state = {
    search: ''
  }

  onChange = e => {
    this.setState({
      search: e.target.value
    })
  }

  renderList = (usergroups, usergroupId) => {
    return usergroups.map((ug, index) => {
      let count = ug.params.total || 0
      let title = `${ug.title} (${count})${ug.description? (' : ' + ug.description) : ''}`
      let cls = '' + ug.id === usergroupId
        ? 'elli block' + ' active'
        : 'elli block'
      return (
        <div key={index} className="usergroup-unit">
          <Tooltip placement="right" title={title}>
            <Link className={cls} to={`/console/usergroup/${ug.id}`}>
              {
                count
                  ? <Badge
                    count={count}
                    overflowCount={10000000}
                    style={countStyle}
                    />
                  : <span className="iblock number-badge">{count}</span>
              }
              {' ' + ug.title}
            </Link>
          </Tooltip>
        </div>
      )
    })
  }

  renderEmpty = (search) => {
    return (
      <p className="ug-empty pd2 aligncenter">
        {
          search
            ? '没有找到'
            : '这个项目还没有用户群'
        }
      </p>
    )
  }

  render () {
    let { usergroups, usergroup, datasourceCurrent } = this.props
    let { search } = this.state
    let { id: usergroupId } = usergroup
    let usergroups0 = usergroups.filter(p => {
      return datasourceCurrent.id === p.druid_datasource_id &&
        (search
          ? p.title.includes(search)
          : true)
    })

    return (
      <div className="usergroup-list">
        <div className="search-box pd2">
          <Search
            onChange={this.onChange}
            value={search}
            placeholder="搜索"
          />
        </div>
        <div className="usergroup-list-wrapper">
          {
            usergroups0.length
              ? this.renderList(usergroups0, usergroupId)
              : this.renderEmpty(search)
          }
        </div>
      </div>
    )
  }
}
