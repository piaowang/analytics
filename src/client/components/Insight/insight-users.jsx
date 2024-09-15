import React from 'react'
import { Spin, Button, Tooltip, Popover, Select, message } from 'antd'
import Icon from '../Common/sugo-icon'
import _ from 'lodash'
import DistinctCascadeFetcher from '../Fetcher/distinct-cascade-fetcher'
import {convertDateType} from 'common/param-transform'
import Loading from '../Common/loading'

const {Option} = Select

export default class InsightUsers extends React.Component {

  constructor(props) {
    super(props)
    let groupby = _.get(
      props.datasource,
      'params.commonMetric[0]'
    )
    this.state = {
      userId: '',
      groupby,
      showPop: false
    }
  }

  componentDidMount() {
    this.dom1 = document.getElementById('container')
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.datasource, this.props.datasource)) {
      let groupby = _.get(
        nextProps.datasource,
        'params.commonMetric[0]'
      )
      this.setState({
        groupby
      })
    }
  }

  componentWillUnmount() {
    this.dom1.removeEventListener('click', this.onClickHidePopover)
  }

  onClickHidePopover = () => {
    this.setState({
      showPop: false
    })
    this.dom1.removeEventListener('click', this.onClickHidePopover)
  }

  changeUserId = userId => {
    this.setState({
      userId: userId.slice(0, 100)
    })
  }

  changeGroupby = groupby => {
    this.setState({
      groupby,
      userId: ''
    })
  }

  confirm = () => {
    let {groupby, userId} = this.state
    let {id} = this.props.datasource
    if (!userId) return message.error('用户ID不能为空', 5)
    this.props.changeUrl({
      id: '__temp' + Math.random(),
      groupby,
      datasource: id,
      user: userId
    })
    this.onClickHidePopover()
  }

  showPop = () => {
    this.setState({
      showPop: true
    })
    this.dom1.addEventListener('click', this.onClickHidePopover)
  }

  renderValueSelect = () => {

    let {
      userId,
      groupby
    } = this.state

    let {
      relativeTime,
      since,
      until,
      datasource,
      dimensions
    } = this.props

    let [finalSince, finalUntil] = relativeTime === 'custom'
      ? [since, until]
      : convertDateType(relativeTime)

    let noContentHint = `${finalSince} ~ ${finalUntil} 查无数据`
    let dbDim = _.find(dimensions, dbD => dbD.name === groupby) || {}
    if (!datasource.id) {
      return null
    }
    return (
      <DistinctCascadeFetcher
        since={finalSince}
        until={finalUntil}
        relativeTime={relativeTime}
        dbDim={dbDim}
        dataSourceId={datasource.id}
      >
        {({isFetching, data, onSearch, isWaitingForInput}) => {
          let notFoundContent = isFetching
            ? '加载中'
            : isWaitingForInput ? '等待输入' : noContentHint

          data = (data || []).filter(d => d)
          if (isFetching) data = [{
            value: '__loading',
            title: '载入中...'
          }]
          return (
            <Loading className="iblock" isLoading={isFetching}>
              <Select
                className="inline width200"
                value={userId}
                showSearch
                notFoundContent={notFoundContent}
                dropdownMatchSelectWidth={false}
                onSearch={onSearch}
                onChange={this.changeUserId}
              >
                {
                  data.map((m, i) => {
                    let v = m.value || m
                    return (
                      <Option key={v + '@fv' + i} value={v}>
                        {m.title || v}
                      </Option>
                    )
                  })
                }
              </Select>
            </Loading>
          )
        }}
      </DistinctCascadeFetcher>
    )
  }

  renderAddUser = () => {
    let {
      groupby
    } = this.state
    let {
      dimensionTree,
      datasource
    } = this.props

    let groupbys = _.get(
      datasource,
      'params.commonMetric'
    ) || []

    return (
      <div className="pd1">
        <div className="pd2b">
          <h3>查询当前项目单个用户的行为记录</h3>
        </div>
        <div className="pd1b">
          <span className="iblock mg1r width100">用户ID类型:</span>
          <Select
            className="iblock width200"
            onChange={this.changeGroupby}
            placeholder="请选择"
            value={groupby || undefined}
          >
            {
              groupbys.map((name, i) => {
                let title = dimensionTree[name] || name
                return (
                  <Option
                    key={i + 'ds_gb' + name}
                    value={name}
                  >
                    {title}
                  </Option>
                )
              })
            }
          </Select>
        </div>
        <div className="pd2b">
          <span className="iblock mg1r width100">用户ID:</span>
          {this.renderValueSelect()}
        </div>

        <div className="pd2t pd1b bordert aligncenter">
          <Button
            type="primary"
            onClick={this.confirm}
          >确定</Button>
          <Button
            type="ghost"
            className="mg2l"
            onClick={this.onClickHidePopover}
          >取消</Button>
        </div>

      </div>
    )
  }

  render () {
    let {
      users,
      user,
      onChange,
      loading,
      getUsers,
      pageIndex,
      nomoreUsers,
      loadingEventCount,
      loadingEventList,
      style
    } = this.props

    let {
      showPop
    } = this.state

    let userQuery = (
      <Tooltip title="查看任意用户的行为记录">
        <Popover
          content={this.renderAddUser()}
          visible={showPop}
          trigger="click"
          placement="bottomLeft"
        >
          <span
            className="pointer font13 color-purple"
            onClick={this.showPop}
          >自定义查询</span>
        </Popover>
      </Tooltip>
    )
    let loadingState = loading || loadingEventCount || loadingEventList

    return (
      <div className="insight-users" style={style}>
        <Spin spinning={loadingState} style={style}>
          <div className="pd2t pd2x bg-white">
            <div className="fix borderb pd2b">
              <div className="fleft">用户列表：</div>
              <div className="fright">
                {userQuery}
              </div>
            </div>
          </div>
          <div className="insight-user-list font12" style={{height: style.height - 54}}>
            {
              users.length
                ? users.map((u, i) => {
                  let cls = user === u
                    ? 'on'
                    : 'pd1y'
                  let pointerStyle = loadingState
                    ? { 'pointerEvents': 'none' }
                    : {}
                  return (
                    <div
                      className={'insight-user ' + cls}
                      style={pointerStyle}
                      key={i + 'user-item' + u}
                      onClick={() => !loadingState ? onChange(u) : ''}
                    >
                      <Tooltip title={u} placement="right">
                        <span className="iblock width-100 elli">
                          <Icon type="sugo-user"/>
                          <span className="mg1l">{u}</span>
                        </span>
                      </Tooltip>
                    </div>
                  )
                })
                : <p className="pd2">这个分群没有用户</p>
            }
            {
              nomoreUsers || !users.length
                ? null
                : <div className="insight-load-more aligncenter pd2y">
                  <Button
                    type="ghost"
                    onClick={() => getUsers(pageIndex + 1)}
                  >加载更多...</Button>
                </div>
            }

          </div>
        </Spin>
      </div>
    )
  }
}
