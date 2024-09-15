import React from 'react'
import {
  CloseOutlined,
  DownloadOutlined,
  PlusCircleOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Button,
  Popconfirm,
  InputNumber,
  Spin,
  Tooltip,
  Popover,
  Radio,
  Input,
  message,
  Select,
} from 'antd';
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import { Link, browserHistory } from 'react-router'
import _ from 'lodash'
import moment from 'moment'
import DateRangePicker from '../Common/time-picker'
import {checkPermission, Auth} from '../../common/permission-control'
import {formItemLayout, formItemLayout1} from '../Usergroup/constants'
import {diff} from '../../common/diff'
import {canVisitUsergroup, alertSaveAsSuccess, canCreateUsergroup, propsToSubmit} from './constants'
import MultiSelect from '../Common/multi-select-buttons'
import {convertDateType} from '../../../common/param-transform'
import SegmentList from './list-render'
import {exportFile} from '../../../common/sugo-utils'
import SaveAsModal from './save-sa-usergroup-modal'
import statusMap, {statusConstant} from '../../../common/segment-status-map'
import {segmentExpandAlgs} from '../../../common/segment-expand-alg-map.js'
import MaxTimeFetcher from '../Fetcher/max-time-fetcher'
import {getInsightUrlByUserGroup} from '../../common/usergroup-helper'

const FormItem = Form.Item
const ButtonGroup = Button.Group
const RadioGroup = Radio.Group
const {Option} = Select
const limitRange = [1, 300000]
const defaultTimeFormat = 'YYYY-MM-DD HH:mm:ss'
const canDel = checkPermission('app/segment-expand/delete')

const maxDic = {
  title: 254,
  description: 500
}
const defaultTime = () => {
  let relativeTime = '-7 days'
  let [since, until] = convertDateType(relativeTime)
  return {
    relativeTime,
    since,
    until
  }
}
const listPath = '/console/segment-expand'
const initSegmentExpandAlg = () => {
  return segmentExpandAlgs[0].value
}
const createSegmentExpand = (datasouece = {}, uid, usergroup = {
  id: '',
  params: {groupby: ''}
}) => {
  return {
    id: uid,
    datasource_id: datasouece.id,
    usergroup_id: usergroup.id,
    params: {
      measures: [],
      limit: 1000,
      alg: initSegmentExpandAlg(),
      groupby: _.get(usergroup, 'params.groupby') || '',
      ...defaultTime()
    }
  }
}
const msgMap = {
  deleted: '分群已经删除',
  none: '这个项目下还没有分群'
}

function equals(v1, v2) {
  if (typeof v1 === 'undefined' && typeof v2 === 'undefined') return false
  else if (!v1 && !v2) return true
  return v1 === v2
}

@alertSaveAsSuccess
export default class SegmentExpandForm extends React.Component {

  constructor(props) {
    super(props)
    let {segmentExpandId} = props.params
    let {segmentExpands, datasourceCurrent, usergroups} = props
    let segmentExpand = createSegmentExpand()
    if (segmentExpandId && segmentExpands.length) {
      segmentExpand = _.find(segmentExpands, {id: segmentExpandId})
    } else if (
      !segmentExpandId &&
      usergroups.length &&
      datasourceCurrent.id
    ) {
      let usergroup = _.find(usergroups, {druid_datasource_id: datasourceCurrent.id}) || {}
      segmentExpand = createSegmentExpand(datasourceCurrent, '', usergroup)
    }
    this.state = {
      segmentExpand,
      loadingStatus: false,
      downloading: false,
      saving: false,
      refreshing: false,
      saveAsModalVisible: false,
      loadingDimension: false
    }
    this.getDatas()
  }

  componentWillReceiveProps(nextProps) {
    let {datasourceCurrent} = nextProps
    let nid = datasourceCurrent.id
    let cid = this.props.datasourceCurrent.id
    if (
      nid !== cid
    ) {
      return this.pickDatasource(nextProps)
    }
    let {segmentExpandId} = nextProps.params
    let {segmentExpands, usergroups} = nextProps
    let oldSegmentExpand = this.state.segmentExpand
    if (
      segmentExpandId &&
      segmentExpands.length &&
      !equals(oldSegmentExpand.id, segmentExpandId)
    ) {
      this.initSegmentExpandData(segmentExpands, segmentExpandId)
    } else if (
      !segmentExpandId &&
      usergroups.length &&
      !equals(oldSegmentExpand.id, segmentExpandId)
    ) {
      this.initSegmentExpandEmptyData(datasourceCurrent, usergroups)
    } else if (segmentExpandId !== this.props.params.segmentExpandId)  {
      this.getDatas()
    }
  }

  controlHeight = () => {
    return { minHeight: window.innerHeight - 99 }
  }

  on404 = () => {
    setTimeout(() => browserHistory.push(listPath), 7000)
    return message.error('扩群不存在', 7)
  }

  initSegmentExpandData = (segmentExpands, segmentExpandId) => {
    let segmentExpand = _.find(segmentExpands, {id: segmentExpandId})
    if (!segmentExpand) {
      return this.on404()
    }
    this.setState({
      segmentExpand
    }, this.getDatas)
  }

  initSegmentExpandEmptyData = (datasource, usergroups) => {
    let usergroup = _.find(usergroups, {druid_datasource_id: datasource.id}) || {}
    let segmentExpand = createSegmentExpand(datasource, '', usergroup)
    this.setState({
      segmentExpand
    }, this.getDatas)
  }

  getDatas = async () => {
    let {datasource_id} = this.state.segmentExpand
    if(!datasource_id) return
    this.setState({
      loadingDimension: true
    })
    await this.props.getDimensions(datasource_id)
    await this.props.getMeasures(datasource_id)
    this.setState({
      loadingDimension: false
    })
    this.checkTimeDimension()
  }

  checkTimeDimension = () => {
    setTimeout(() => {
      let hasTimeDimension = _.find(this.props.dimensions, d => {
        return d.name === '__time'
      })
      if (!hasTimeDimension) {
        this.removeTimeAttr()
      }
    }, 100)
  }

  removeTimeAttr = () => {
    let segmentExpand = _.cloneDeep(this.state.segmentExpand)
    delete segmentExpand.params.relativeTime
    delete segmentExpand.params.since
    delete segmentExpand.params.until
    this.setState({segmentExpand})
  }

  modifier = (...args) => {
    this.setState(...args)
  }

  showModal = () => {
    this.setState({
      saveAsModalVisible: true
    })
  }

  hideModal = () => {
    this.setState({
      saveAsModalVisible: false
    })
  }

  updateByPath = (path, data, cb) => {
    let segmentExpand = _.cloneDeep(this.state.segmentExpand)
    _.set(segmentExpand, path, data)
    this.setState({segmentExpand}, cb)
  }

  getFilteredUsergroups = (
    datasource_id = this.props.datasourceCurrent.id,
    usergroups = this.props.usergroups
  ) => {
    return usergroups.filter(ug => {
      return ug.druid_datasource_id === datasource_id
    })
  }

  pickDatasource = (nextProps) => {
    let segmentExpand = _.cloneDeep(this.state.segmentExpand)
    let {datasourceCurrent} = nextProps
    let {id} = datasourceCurrent
    segmentExpand.datasource_id = id
    _.set(segmentExpand, 'params.measures', [])
    let filteredUsergroups = this.getFilteredUsergroups(id)
    let ug = filteredUsergroups[0] || {id: ''}
    _.set(segmentExpand, 'usergroup_id', ug.id)
    _.set(segmentExpand, 'params.groupby', _.get(ug, 'params.groupby') || '')
    this.setState({segmentExpand}, this.getDatas)
  }

  onChangeDate = ({dateType, dateRange: [since, until]}) => {
    let segmentExpand  = _.cloneDeep(this.state.segmentExpand)
    _.assign(segmentExpand.params, {
      since,
      until,
      relativeTime: dateType
    })
    this.setState({
      segmentExpand
    })
  }

  onChangeLimit = limit => {
    this.updateByPath('params.limit', parseInt(limit, 10) || limitRange[0])
  }

  onChangeProp = (prop, e) => {
    let segmentExpand = _.cloneDeep(this.state.segmentExpand)
    segmentExpand[prop] = e.target.value.slice(0, maxDic[prop])
    this.setState({
      segmentExpand
    })
  }

  del = async () => {
    let {segmentExpand} = this.state
    let res = await this.props.delSegmentExpand(segmentExpand)
    if (!res) return
    message.success('删除成功')
    browserHistory.push(listPath)
  }

  saveAsUsergroup = async (title) => {
    let {id} = this.state.segmentExpand
    this.setState({
      saving: true
    })
    let res = await this.props.saveAsUsergroup({id, title})
    this.setState({
      saving: false
    })
    if (!res) return
    this.alertSaveAsSuccess(res.result)
  }

  //todo better validate
  validate = () => {
  
    let {
      segmentExpand: {
        params: {measures},
        title
      }
    } = this.state

    if(!title) {
      message.error('请填写扩群名称', 5)
      return false
    }

    if(!measures.length) {
      message.error('请选择特征指标', 5)
      return false
    }

    return true

  }

  addSegmentExpand = async () => {
    let res = await this.props.addSegmentExpand(this.state.segmentExpand)
    if (res) {
      message.success('创建扩群成功', 8)
      browserHistory.push(`/console/segment-expand/${res.result.id}`)
    }
  }

  updateState = obj => {
    let segmentExpand = _.cloneDeep(this.state.segmentExpand)
    Object.assign(segmentExpand, obj)
    this.setState({segmentExpand})
  }

  updateSegmentExpand = async (
    segmentExpand = this.state.segmentExpand,
    msg = '修改扩群成功'
  ) => {
    let {segmentExpands, setProp} = this.props
    let {id} = segmentExpand
    let oldSegmentExpand = _.find(segmentExpands, {id: segmentExpand.id}) || {}
    let update = diff(segmentExpand, oldSegmentExpand, propsToSubmit)
    let res = await this.props.updateSegmentExpand(id, update)
    if (!res) return
    let updateObj = {...segmentExpand, ...res.result}

    setProp(
      'update_segmentExpands',
      updateObj
    )
    this.updateState(res.result)
    message.success(msg)
  }

  onReCompute = () => {
    let {id} = this.state.segmentExpand
    let {segmentExpands} = this.props
    let se = _.find(segmentExpands, {id})
    if (!se) return
    let segmentExpand = _.cloneDeep(se)
    segmentExpand.params.reCompute = Date.now()
    this.updateSegmentExpand(segmentExpand, '开始重新计算')
  }

  submit = (e) => {
    e.preventDefault()
    let pass = this.validate()
    if(!pass) return

    let {id} = this.state.segmentExpand
    if (id) {
      this.updateSegmentExpand()
    } else {
      this.addSegmentExpand()
    }

  }

  del = async () => {
    let {segmentExpand} = this.state
    let res = await this.props.delSegmentExpand(segmentExpand)
    if (!res) return
    message.success('删除成功')
    browserHistory.push(listPath)
  }

  downloadIds = segmentExpand => {
    return async () => {
      let {id, title} = segmentExpand
      this.setState({loading: true})
      let res = await this.props.getSegmentExpandIds({id})
      this.setState({loading: false})
      if (!res) return
      let content = res.result.ids.join('\n')
      exportFile(`扩群_${title}_id_${moment().format('YYYY-MM-DD')}.txt`, content)
    }
  }

  renderRefLink = () => {
    let {usergroups} = this.props
    let {usergroup_id} = this.state.segmentExpand
    let ug = _.find(usergroups, {id: usergroup_id})
    let {title} = ug || {}

    return usergroup_id && canVisitUsergroup
      ? (
      <Link to={getInsightUrlByUserGroup(ug)}>
        <Tooltip
          title={`查看扩群基于的分群： "${title}"`}
          placement="bottomRight"
        >
          <span
            icon="team"
            className="mg2l iblock"
          >
            <TeamOutlined /> 查看分群用户
          </span>
          </Tooltip>
        </Link>
      ) : null
  }

  renderDelBtn = () => {
    let {segmentExpand} = this.state
    return !canDel
      ? null
      : <Popconfirm
          title={`确定删除用户扩群 "${segmentExpand.title}" 吗？`}
          placement="topLeft"
          onConfirm={this.del}
        >
          <Button type="ghost"  icon={<CloseOutlined />}>删除</Button>
        </Popconfirm>
  }

  renderSaveAsUsergroupBtn = () => {
    if (!canCreateUsergroup) return null
    let {saving, segmentExpand: {status}} = this.state
    let {loading} = this.props
    if (!canCreateUsergroup || status !== statusConstant.done) {
      return null
    }
    return (
      <Button
        type="ghost"
        icon={<SaveOutlined />}
        loading={saving}
        disabled={loading || saving}
        onClick={this.showModal}
      >
        另存为分群
      </Button>
    );
  }

  renderDownloadBtn = () => {
    let {segmentExpand, downloading, loadingStatus} = this.state
    let {count, status} = segmentExpand
    if (status !== statusConstant.done) return null
    return (
      <Tooltip title="下载id列表">
        <Button
          onClick={this.downloadIds(segmentExpand)}
          disabled={downloading || loadingStatus}
          icon={<DownloadOutlined />}
          loading={downloading}
        >
          下载id列表
          {count ? `(${count})`: ''}
        </Button>
      </Tooltip>
    );
  }

  onRefresh = async () => {
    this.setState({
      refreshing: true
    })
    let {id} = this.state.segmentExpand
    let res = await this.props.checkSegmentExpandStatus({id})
    this.setState({
      refreshing: false
    })
    if (!res) return
    let {setProp} = this.props
    setProp('update_segmentExpands', {
      id,
      ...res.result
    })
    this.updateState(res.result)

    let {message: str, status} = res.result
    let statusMsg = statusMap[status] || '完毕'
    let err = str ? `, ${str}` : ''
    message.success(`状态更新:${statusMsg}${err}`, 10)
  }

  renderRefreshBtn = () => {
    let {status} = this.state.segmentExpand
    let {refreshing} = this.state
    if (status !== statusConstant.computing) return null
    return (
      <Popover
        content="扩群计算中，可以点击更新状态，确认是否计算完毕"
      >
        <Button
          type="ghost"
          onClick={this.onRefresh}
          loading={refreshing}
          icon={<ReloadOutlined />}
          disabled={refreshing}
        >更新状态 <QuestionCircleOutlined /></Button>
      </Popover>
    );
  }

  renderReComputeBtn = () => {
    let {status} = this.state.segmentExpand
    if (status <= statusConstant.computing) return null
    return (
      <Button
        type="ghost"
        onClick={this.onReCompute}
        icon={<ReloadOutlined />}
      >重新计算扩群</Button>
    );
  }

  renderBtns = () => {
    let {id, status, message: err} = this.state.segmentExpand
    if (!id) return null
    let msg = statusMap[status]
    return (
      <FormItem wrapperCol={{ span: 21, offset: 3 }}>
        <div>
          状态：
          <Tooltip
            title={err || msg}
          >
            <b>{msg}</b>
          </Tooltip>
        </div>
        <div className="buttons">
          <ButtonGroup>
            {this.renderSaveAsUsergroupBtn()}
            {this.renderDownloadBtn()}
            {this.renderRefreshBtn()}
            {this.renderReComputeBtn()}
            {this.renderDelBtn()}
          </ButtonGroup>
        </div>
      </FormItem>
    )
  }

  renderFormBtn = segmentExpand => {
    let txt = segmentExpand.id
      ? '更新扩群'
      : '保存并计算扩群'
    return (
      <FormItem wrapperCol={{ span: 12, offset: 3 }}>
        <hr />
        <Button
          type="success"
          htmlType="submit"
        >
          {txt}
        </Button>
      </FormItem>
    )
  }

  renderDatePicker = (disabled) => {
    let {since, until, relativeTime} = this.state.segmentExpand.params
    if (!relativeTime) return null
    let dateRange = [since, until]
    let dateType = relativeTime
    let props = {
      dateRange,
      dateType,
      disabled,
      onChange: this.onChangeDate,
      className: 'width260'
    }
    return (
      <FormItem {...formItemLayout} label="时间范围">
        <DateRangePicker
          {...props}
        />
      </FormItem>
    )
  }

  renderGroupBy = () => {
    let {dimensions} = this.props
    let {groupby} = this.state.segmentExpand.params
    let dim = _.find(dimensions, {
      name: groupby
    }) || {name: '未选择分群'}
    return (
      <FormItem {...formItemLayout} label="用户id">
        {dim.title || dim.name}
      </FormItem>
    )
  }

  renderTitleInput = (title) => {
    return (
      <FormItem
        {...formItemLayout1}
        label="扩群名称"
        required
      >
        <Input
          type="text"
          value={title}
          onChange={e => this.onChangeProp('title', e)}
        />
      </FormItem>
    )
  }

  renderDesc = (description) => {
    return (
      <FormItem
        {...formItemLayout1}
        label="备注"
      >
        <Input.TextArea
          rows={2}
          value={description}
          onChange={e => this.onChangeProp('description', e)}
        />
      </FormItem>
    )
  }

  renderLimit = (disabled) => {
    let {limit} = this.state.segmentExpand.params
    let [min, max] = limitRange
    let props = {
      max,
      min,
      disabled,
      value: limit,
      className: '',
      onChange: this.onChangeLimit
    }
    return (
      <FormItem
        {...formItemLayout1}
        label="用户数量"
      >
        <InputNumber
          {...props}
        />
        <Tooltip
          title={`扩群计算用户数量最大值，不超过${max}，超过系统默认设定为${max}`}
        >
          <QuestionCircleOutlined />
        </Tooltip>
      </FormItem>
    );
  }

  renderAlg = (disabled) => {
    let {alg} = this.state.segmentExpand.params
    return (
      <FormItem
        {...formItemLayout1}
        label="扩群算法"
      >
        <RadioGroup
          value={alg}
          disabled={disabled}
        >
          {
            segmentExpandAlgs.map((alg, i) => {
              let {value, title} = alg
              return (
                <Radio
                  key={i + '@alg@' + value}
                  value={value}
                >{title}</Radio>
              )
            })
          }
        </RadioGroup>
      </FormItem>
    )
  }

  renderForm = () => {
    let {segmentExpand} = this.state
    let {title, description, status} = segmentExpand
    let disabled = status === statusConstant.computing

    return (
      <Form onSubmit={this.submit}>
        {this.renderBtns()}
        {this.renderTitleInput(title)}
        {this.renderDatePicker(disabled)}
        {this.renderUsergroupSelect(disabled)}
        {this.renderGroupBy()}
        {this.renderMeasuresSelect(disabled)}
        {this.renderLimit(disabled)}
        {this.renderAlg(disabled)}
        {this.renderDesc(description)}
        {this.renderFormBtn(segmentExpand)}
      </Form>
    )
  }

  onPickUsergroup = id => {
    let filteredUsergroups = this.getFilteredUsergroups()
    let ug = _.find(filteredUsergroups, {id})
    let segmentExpand = _.cloneDeep(this.state.segmentExpand)
    segmentExpand.usergroup_id = id
    segmentExpand.params.groupby = ug.params.groupby
    this.setState({
      segmentExpand
    })
  }

  renderUsergroupSelect = (disabled) => {
    let {segmentExpand} = this.state
    let {usergroup_id} = segmentExpand
    let filteredUsergroups = this.getFilteredUsergroups()
    let noUsergroupTip = usergroup_id
      ? msgMap.deleted
      : msgMap.none
    let usergroup = _.find(filteredUsergroups, {id: usergroup_id}) || {
      id: noUsergroupTip
    }
    let value = usergroup.id
    return (
      <FormItem
        {...formItemLayout1}
        required
        label="参照目标群"
      >
        <Select
          {...enableSelectSearch}
          className="iblock width260"
          value={value}
          disabled={disabled}
          onChange={this.onPickUsergroup}
        >
          {filteredUsergroups.map((m, i) => {
            return (
              <Option key={i + '@u@' + m.id} value={m.id}>
                {m.title}
              </Option>
            )
          })}
        </Select>
        {this.renderRefLink()}
      </FormItem>
    )
  }

  onChangeMeasures = measures => {
    this.updateByPath('params.measures', measures)
  }

  renderMeasuresSelect = (disabled) => {
    let {measures: options} = this.props
    let {
      params: {
        measures: value
      }
    } = this.state.segmentExpand
    let props = {
      options,
      value,
      getValueFromOption: option => option.name,
      onChange: this.onChangeMeasures,
      disabled,
      renderExtra: () => {
        return (
          <Auth auth="/console/measure">
            <Link className="mg1l pointer" to={'/console/measure'}>
              <PlusCircleOutlined /> 新建指标
            </Link>
          </Auth>
        );
      }
    }
    return (
      <FormItem
        {...formItemLayout1}
        required
        label="特征指标"
      >
        <div className="pd1b gont14 bold">
          (选择扩群重要特征指标)
        </div>
        <div className="se-border-wrap">
          <MultiSelect
            {...props}
          />
        </div>
      </FormItem>
    )
  }

  renderSegmentExpandList = () => {
    let {datasources, segmentExpands} = this.props
    let {segmentExpand} = this.state
    let props = {
      datasources,
      segmentExpands,
      segmentExpand
    }
    return (
      <SegmentList
        {...props}
      />
    )
  }

  onMaxTimeLoaded = maxTime => {
    let segmentExpand = _.cloneDeep(this.state.segmentExpand)
    if (segmentExpand.id) return
    if (moment(maxTime).isBefore(moment().add(-7, 'days').startOf('day'))) {
      let finalUntil = moment(maxTime).add(1, 'day').startOf('day').format(defaultTimeFormat)
      let finalSince = moment(finalUntil).add(-7, 'day').format(defaultTimeFormat)
      Object.assign(segmentExpand.params, {
        since: finalSince,
        until: finalUntil,
        relativeTime: 'custom'
      })
      this.setState({
        segmentExpand
      })
    }
  }

  renderMaxTime = () => {
    let {
      datasource_id
    } = this.state.segmentExpand
    return (
      <MaxTimeFetcher
        dataSourceId={datasource_id || ''}
        doFetch={!!datasource_id}
        onMaxTimeLoaded={this.onMaxTimeLoaded}
      />
    )
  }

  render () {
    let {segmentExpand, saveAsModalVisible} = this.state
    return (
      <Spin spinning={this.props.loading}>
        <div className="ug-wrapper relative" style={this.controlHeight()}>
          {this.renderSegmentExpandList()}
          {this.renderMaxTime()}
          <div className="ug-info pd3t">
            {this.renderForm()}
            <SaveAsModal
              {...this.props}
              segmentExpand={segmentExpand}
              saveAsUsergroup={this.saveAsUsergroup}
              hideModal={this.hideModal}
              visible={saveAsModalVisible}
            />
          </div>
        </div>
      </Spin>
    )
  }
}
