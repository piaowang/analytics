/**
 * 智能画像
 */

import React from 'react'
import {
  AreaChartOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Button, Tooltip, Table, Progress, Spin } from 'antd';
import moment from 'moment'
import Fetch, {handleErr} from '../../common/fetch-final'
import _ from 'lodash'
import setStatePromiseDec from '../../common/set-state-promise'
import {decompressUrlQuery, isDiffByPath} from '../../../common/sugo-utils'
import toUgFilters from '../../../common/slice-filter-to-ug-filter'
import {convertDateType, isRelative, tagFiltersAdaptToOldFormat} from '../../../common/param-transform'
import {createUsergroup} from '../../common/usergroup-helper'
import {recurFindFilter} from '../../../common/druid-query-utils'

const TAG_AI_URL = '/app/tag-type/top10'

//返回结果 status 状态 0:未计算， 1:计算中, 2:计算完成, 3: 计算失败
const statusNameMap = {
  'init': 0,
  'running': 1,
  'done': 2,
  'fail': 3
}
const statusNameMapRev = _.invert(statusNameMap)
const codeMap = {
  0: '正常',
  1000: '计算出错了',
  1001: '当前分群无法查询到数据，请尝试其他分群',
  1002: '获取数据超时了',
  1003: '当前分群覆盖了所有用户，无法对比'
}
const TIMER = 5000

@setStatePromiseDec
export default class TagCompare extends React.Component {

  state = {
    data: [],
    querying: false,
    status: 0,
    lastComputeTime: null,
    code: 0
  }

  componentWillMount() {
    this.initData()
  }

  componentWillReceiveProps(nextProps) {
    if (isDiffByPath(nextProps, this.props, 'location.query.ugId')) {
      this.setState({
        data: [],
        querying: false,
        status: 0,
        lastComputeTime: null,
        code: 0
      }, this.initData)
    }
  }

  componentWillUnmount() {
    this.unmounted = true
    clearTimeout(this.timer)
  }

  initData = async () => {
    let res = await this.getTagAICreateStatus()
    let update = {}
    if (res) {
      let {status} = res.result
      update = res.result
      if (status === statusNameMap.done) {
        let res1 = await this.queryTagAI()
        if (res1) {
          update.data = res1
        }
      }
    }
    this.setState(update)
    if (update.status === statusNameMap.running) {
      this.checkStatus()
    }
  }

  loading = (querying) => {
    return this.setStatePromise({querying})
  }

  // 递归读取 filter 的 col TODO reuse
  recurGetFiltersCol = (filters) => {
    return _.flatMap(filters, flt => {
      let {op} = flt
      if (op === 'or' || op === 'and' || op === 'not') {
        let eq = _.isArray(flt.eq) ? flt.eq : [flt.eq]
        return this.recurGetFiltersCol(eq.filter(_.identity).map(flt0 => ({...flt, ...flt0})))
      }
      return [flt.col].filter(_.identity)
    })
  }

  getTagsInUrl () {
    let tagsInUrlStr = _.get(this.props, 'location.query.tags')
    return tagsInUrlStr && JSON.parse(decompressUrlQuery(tagsInUrlStr)) || null
  }

  getCurrUg = () => {
    let ugIdInUrl = _.get(this.props, 'location.query.ugId')
    if (ugIdInUrl) {
      let ug = _.find(this.props.SegmentCollection.list, ug => ug.id === ugIdInUrl)
      if (ug) {
        let currTagFilter = this.getTagsInUrl()
        if (!currTagFilter || _.isEqual(currTagFilter, _.get(ug, 'params.tagFilters'))) {
          return ug
        } else {
          let {datasourceCurrent} = this.props
          // 对于修改过的分群，也需要创建临时分群
          let relation = _.get(this.props, 'location.query.relation') || 'and'

          let timeFlt = _.find(currTagFilter, flt => flt.col === '__time') || { col: '__time', op: 'in', eq: ['1000', '3000'] }
          let relativeTime = isRelative(timeFlt.eq) ? timeFlt.eq : 'custom'
          let [since, until] = relativeTime === 'custom' ? timeFlt.eq : convertDateType(relativeTime)

          let ug0 = createUsergroup({
            userGroupTitle: '临时标签分群',
            dataSourceId: datasourceCurrent.id,
            dataSourceName: datasourceCurrent.name,
            metricalField: _.get(this.props, 'datasourceCurrent.params.commonMetric[0]'),
            relativeTime,
            since: moment(since).toISOString(),
            until: moment(until).toISOString(),
            openWith: 'tag-dict', // 编辑时只能用用户画像打开
            tagFilters: [{op: relation, eq: currTagFilter}]
          })

          return ug0
        }
      }
    }
    return _.get(this.props, 'SegmentCollection.list[0]')
  }

  checkStatus = async () => {
    // 存在分群，检查智能画像创建情况
    let ug = this.getCurrUg()
    let res = await this.getTagAICreateStatus(ug.id)
    let update = {}
    if (res) {
      update = res.result
      if (update.status === statusNameMap.done) {
        let data = await this.queryTagAI(ug.id)
        if (data) {
          update.data = data
        }
      }
      this.setState(update)
    }
    if (update.data || this.unmounted) {
      return
    }
    this.timer = setTimeout(this.checkStatus, TIMER)
  }

  /**
   * 创建智能画像
   * 调用 node 端 create(ugId)
   * node 端判断 byWhichUserGroup 是否临时分群，否的话直接创建智能画像，否的话先创建 tempLookups
   * 检查状态时，判断该分群是否临时分群，否的话直接查询智能分群接口，是的话检查 lookups 列表
   * @returns {Promise.<void>}
   */
  start = async () => {
    let ug = this.getCurrUg()

    let res = await this.createTagAI(ug)
    if (res) {
      await this.setStatePromise(res.result)
    }
    this.checkStatus()
  }

  createTagAI = async (ug = this.getCurrUg()) => {
    let body = {
      // 这个 usergroup_id 不能以 usergroup_ 开头
      usergroup_id: ug.id
    }
    if (_.startsWith(ug.id, 'temp_usergroup_')) {
      body.tempUsergroup = ug
    }
    return await Fetch.post(TAG_AI_URL, body)
  }

  getTagAICreateStatus = async (ugId = _.get(this.getCurrUg(), 'id')) => {
    return await Fetch.get(`${TAG_AI_URL}/status`, {usergroup_id: ugId}, {handleErr: res => {
      // 500 错误才弹出提示
      if (res.status >= 500) {
        return handleErr(res)
      } else {
        console.log(res)
      }
    }})
  }

  queryTagAI = async (ugId = _.get(this.getCurrUg(), 'id')) => {
    let data = await Fetch.get(TAG_AI_URL, {usergroup_id: ugId})

    let arr = _.get(data, 'result.result')
    if (arr) {
      let ugIdInUrl = _.get(this.props, 'location.query.ugId')
      let ug = _.find(this.props.SegmentCollection.list, ug => ug.id === ugIdInUrl)
      let ugTagFilters = _.get(ug, 'params.tagFilters') || []
      let tagFilters = this.getTagsInUrl() || tagFiltersAdaptToOldFormat(ugTagFilters).tagFilters
      let tags = tagFilters ? this.recurGetFiltersCol(tagFilters) : [_.get(this.props, 'VM.tagEnhanceInfo.tag', '')]
      let colSet = new Set(tags)
      arr = arr.filter(r => !colSet.has(r.dimension))
    }
    return arr && _(arr).orderBy(['f', 'ratio'], ['desc', 'desc']).take(20).value()
  }

  renderFTitle() {
    return (
      <Tooltip
        title="标签重要度是通过机器学习算法来寻找关键特征得到的一个判断指标，该判断指标主要用基尼系数来表示，该标签重要度系数越大，代表该特征对该用户群就越显著。"
      >
        <div>标签重要度 <QuestionCircleOutlined /></div>
      </Tooltip>
    );
  }

  getTitle = dimName => {
    let obj = _.get(this.props, `VM.dimNameDict.${dimName}`) || {
      name: dimName
    }
    let {name, title, id} = obj
    let type = _.find(
      this.props.VM.tagTypes,
      t => t.dimension_id === id
    ) || {}
    return {
      title: title || name,
      typeTitle: type.type
    }
  }

  renderTagName = (tagName, item) => {
    let {dimension} = item
    let {title} = this.getTitle(dimension)
    return (
      <div>
        <div className="bold pd1b">{title}</div>
        <div className="bold">{tagName}</div>
      </div>
    )
  }

  renderRatio = (r, typeTitle, cls) => {
    let ratio = parseFloat((r * 100).toFixed(1))
    return (
      <div className={cls}>
        <Progress
          status="active"
          percent={ratio}
          showInfo={false}
          width={50}
        />
        <div className="pd1t">
          {typeTitle}拥有该标签占比为 {ratio}%
        </div>
      </div>

    )
  }

  renderTitle(name) {
    let txt = name === '选中用户群'
      ? '表示根据当前标签选中的用户'
      : '表示根据当前标签选中的用户群以外的用户'
    return (
      <Tooltip
        title={txt}
      >
        <span>{name} <QuestionCircleOutlined /></span>
      </Tooltip>
    );
  }

  renderTable() {
    let columns = [
      {
        title: this.renderFTitle(),
        dataIndex: 'f',
        key: 'f',
        sort: (a, b) => a.f - b.f,
        width: 100,
        render: (f) => {
          let cls = f > 0.4 ? 'color-blue' : 'color-grey'
          return (
            <div className={cls}>
              {f.toFixed(2)}
            </div>
          )
        }
      },
      {
        title: '关键标签',
        dataIndex: 'tagName',
        key: 'tagName',
        sort: (a, b) => a.tagName > b.tagName ? 1 : -1,
        render: this.renderTagName
      },
      {
        title: this.renderTitle('选中用户群'),
        dataIndex: 'ratioUsergroup',
        width: '30%',
        key: 'ratioUsergroup',
        sort: (a, b) => a.ratioUsergroup - b.ratioUsergroup,
        render: r => this.renderRatio(r, '选中用户群')
      },
      {
        title: this.renderTitle('未选中用户群'),
        dataIndex: 'ratioCompare',
        key: 'ratioCompare',
        width: '30%',
        sort: (a, b) => a.ratioCompare - b.ratioCompare,
        render: r => this.renderRatio(r, '未选中用户群', 'tag-top10-reverse')
      }
    ]

    return (
      <Table
        columns={columns}
        dataSource={this.state.data}
        rowKey={record => `${record.dimension}_${record.tagName}`}
        size="small"
        pagination={false}
      />
    )
  }

  renderReComputeBtn() {
    let {status} = this.state
    if (status < statusNameMap.done) {
      return null
    }
    return (
      <Button
        className="mg1l"
        type="ghost"
        size="small"
        onClick={this.start}
        icon={<ReloadOutlined />}
      >
        重新画像
      </Button>
    );
  }

  renderStartBtn() {
    let {status} = this.state
    if (status > statusNameMap.running) {
      return null
    }

    let isComputing = status === statusNameMap.running

    return (
      <Button
        className="mg1r"
        type="ghost"
        loading={isComputing}
        icon={<AreaChartOutlined />}
      >
        {
          isComputing ? '智能画像运算中...' : '开始智能画像'
        }
      </Button>
    );
  }

  renderTime(lastComputeTime) {
    if (this.state.status === statusNameMap.running || !lastComputeTime) {
      return null
    }
    return (
      <span className="mg1l">
        画像生成时间: {moment(lastComputeTime * 1000).format('YYYY-MM-DD HH:mm:ss')}
      </span>
    )
  }

  renderState = () => {
    let {lastComputeTime} = this.state
    return (
      <span>
        {this.renderTime(lastComputeTime)}
      </span>
    )
  }

  renderCenter(status) {
    let name = statusNameMapRev[status]
    return this[name + 'MainContent'](status)
  }

  doneMainContent() {
    return this.renderTable()
  }

  failMainContent() {
    let {code} = this.state
    return (
      <div className="pd3 aligncenter color-red">
        <InfoCircleOutlined /> {codeMap[code] || ''}
      </div>
    );
  }

  initMainContent() {
    return (
      <div className="pd3 aligncenter">
        <Button
          className="mg1r"
          type="primary"
          icon={<AreaChartOutlined />}
          onClick={this.start}
        >
          开始智能画像
        </Button>
      </div>
    );
  }

  runningMainContent() {
    return (
      <div className="aligncenter pd3">
        <p className="color-blue font14 pd2y">画像生成中，请耐心等待，或者先使用其他功能，稍后再返回查看</p>
        <p className="color-grey font60 pd2y">
          <LoadingOutlined />
        </p>
      </div>
    );
  }

  render() {
    let {status, lastComputeTime, querying} =this.state
    return (
      <div className="tag-top10">
        <div className="tag-top10-title aligncenter">
          <div className="pd2t pd1b font14 bold">对选中用户群进行智能画像</div>
          <p className="pd3b">
            通过机器学习算法对选中用户群及未选中用户群的标签进行挖掘，得到TOP 20 重要特征标签
            <Tooltip
              title="分析规则：标签重要度值越大，说明该标签越重要"
            >
              <QuestionCircleOutlined className="mg1l" />
            </Tooltip>
          </p>
        </div>
        <Spin spinning={querying}>
          <div className="tag-top10-content">
            <div className="tag-top10-control pd1y">
              {this.renderTime(lastComputeTime)}
              {this.renderReComputeBtn()}
            </div>
            {this.renderCenter(status)}
          </div>
        </Spin>
      </div>
    );
  }

}
