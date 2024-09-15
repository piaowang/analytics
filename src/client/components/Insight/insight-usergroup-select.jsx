import React from 'react'
import { Select, Tooltip, Row, Col } from 'antd'
import _ from 'lodash'

const Option = Select.Option

export default class UsergroupSelect extends React.Component {

  shouldComponentUpdate (nextProps) {
    return !_.isEqual(this.props, nextProps)
  }

  onGroupChange (id) {
    const group = _.find(this.props.usergroups, { id })
    if (group) {
      this.props.onChange(group)
    }
  }

  onGroupByChange (groupby) {
    const {changeUrl} = this.props
    changeUrl({
      groupby
    })
  }

  render () {
    let {
      usergroup,
      usergroups,
      groupbyTitle,
      query: {id},
      groupByList = [],
      user
    } = this.props

    let isAllUser = id === '__all_user'
    let usergroupCount = ((usergroup.params) || {}).total || 0

    let ugRemark = _.get(usergroup, 'description')
    return (
      <div className="fix">
        <div className="fleft">
          <span className="iblock mg1l mg1r">分群：</span>
          <Select
            className="width200 iblock"
            value={usergroup.id}
            onSelect={id => this.onGroupChange(id)}
            showSearch
            dropdownMatchSelectWidth={false}
          >
            {
              usergroups.map((ug, i) => {
                let { id, title } = ug
                return (
                  <Option
                    key={id + '_ug_' + i}
                    value={id}
                    title={title}
                  >
                    {title}
                  </Option>
                )
              })
            }
          </Select>

          {!ugRemark ? null : (
            <span className="color-grey mg1x">备注：{ugRemark}</span>
          )}

          <span className="iblock mg1l">
            <span className="font13 color-grey">({usergroupCount}个用户)</span>
          </span>
          {
            user
              ? <span className="iblock mg1l">
                <Tooltip title={user}>
                  <span className="font13 color-grey iblock mw300 elli">
                  用户: <b>{user}</b>
                  </span>
                </Tooltip>
                {
                  isAllUser
                    ? null
                    : (
                      <div className="font13 iblock mg1l color-grey">
                    用户ID:<b>{groupbyTitle}</b>
                      </div>
                    )
                }
              </span>
              : null
          }
        </div>
        <div className="fright">
          {
            isAllUser
              ? (
                <div className="alignright">
                  <span className="pd1r">切换用户类型为:</span>
                  <Select
                    className="width120 iblock"
                    value={_.get(usergroup, 'params.groupby')}
                    onSelect={groupby => this.onGroupByChange(groupby)}
                  >
                    {groupByList.map(({ title, value }) => (
                      <Option
                        key={value}
                        value={value}
                      >{title}</Option>
                    ))}
                  </Select>
                </div>
              ) : null
          }
        </div>
      </div>
    )
  }
}

