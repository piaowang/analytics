/**
 * 标签组合列表
 */

import React from 'react'
import {Tooltip} from 'antd'
import Search from '../Common/search'
import { Link } from 'react-router'

export default class TagGroupList extends React.Component {

  state = {
    search: ''
  }

  onChange = e => {
    this.setState({
      search: e.target.value
    })
  }

  renderList = (tagGroups, tagGroupId) => {
    return tagGroups.map((ug, index) => {
      let title = `${ug.title} ${ug.description? (' : ' + ug.description) : ''}`
      let cls = '' + ug.id === tagGroupId
        ? 'elli block' + ' active'
        : 'elli block'
      return (
        <div key={index} className="usergroup-unit width-100">
          <Tooltip placement="right" title={title}>
            <Link className={cls} to={`/console/tag-group?id=${ug.id}`}>
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
            : '还没有组合标签'
        }
      </p>
    )
  }

  render () {
    let { tagGroups = [], tagGroup = {}, datasourceCurrent } = this.props
    let { search } = this.state
    let { id: tagGroupId } = tagGroup
    let tagGroups0 = tagGroups.filter(p => {
      return datasourceCurrent.id === p.datasource_id &&
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
            tagGroups0.length
              ? this.renderList(tagGroups0, tagGroupId)
              : this.renderEmpty(search)
          }
        </div>
      </div>
    )
  }

}
