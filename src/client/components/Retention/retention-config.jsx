import moment from 'moment'
import {convertDateType} from 'common/param-transform'
import React from 'react'
import {
  CloseOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  Row,
  Col,
  message,
  Select,
  Popover,
  Popconfirm,
  Button,
  Input,
  Tabs,
  Radio,
  Tooltip,
} from 'antd';
import _ from 'lodash'
import {retentionData} from '../../databus'
import PubSub from 'pubsub-js'
import {dictBy, immutateUpdate, immutateUpdates, isDiffByPath, isDiffBySomePath} from '../../../common/sugo-utils'
import {Auth, checkPermission} from '../../common/permission-control'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import * as ls from '../../common/localstorage'
import CommonDruidFilterPanel from '../Common/common-druid-filter-panel'
import {getUsergroupByBuiltinId, isBuiltinUsergroupId} from '../Common/usergroup-selector'
import {BuiltinUserGroup} from '../../../common/constants'
import {withRetentions} from '../Fetcher/retentions-fetcher'
import {findSuitableRetentionGranularity, getStepPairs, retentionChangeProjLSId} from './retention-helper'
import {withBoundaryTime} from '../Fetcher/boundary-time-fetcher'
import classNames from 'classnames'
import SingleDistinct from '../Common/distinct-cascade'
import Fetch from '../../common/fetch-final'
import {browserHistory} from 'react-router'

const {enableSaveSliceEnhance = false} = window.sugo

const Option = Select.Option
const TabPane = Tabs.TabPane
const {Group: RadioGroup, Button: RadioButton} = Radio

const maxDurationInYears = 1

let canCreateRetension = checkPermission('post:/app/retention/create')
let canEditRetension = checkPermission('post:/app/retention/update')
let canDelRetension = checkPermission('post:/app/retention/delete')


function defaultRetention(datasourceCurrent) {
  let retentionDims = _.get(datasourceCurrent, 'params.commonDimension') || []
  return {
    druid_datasource_id: datasourceCurrent.id,
    datasource_name: datasourceCurrent.name,
    params: {
      retentionDimension: retentionDims,
      startStep: [],
      endStep: [],
      relativeTime: '-7 day',
      since: null,
      until: null
    }
  }
}

@withRetentions()
export default class RetentionConfig extends React.Component {

  state = {
    tempName: undefined,
    showPop: false,
    dateRange: []
  }

  componentDidMount() {
    PubSub.subscribe('retention.reload-retentions', (msg, callback) => {
      this.props.reloadRetention().then(callback || _.noop)
    })
    let { retentionIdInUrl, tempRetention } = this.props
    if (_.get(tempRetention, 'id', '') !== (retentionIdInUrl || '')) {
      this.selectRetention(retentionIdInUrl)
    }
  }

  componentWillReceiveProps (nextProps) {
    let { retentionSelected = {}, datasourceCurrent } = nextProps
    let nid = datasourceCurrent.id
    let tid = this.props.datasourceCurrent.id

    //切换报告
    if (_.get(this.props.retentionSelected, 'name') !== retentionSelected.name) {
      this.setState({ tempName: undefined })
    }

    //初始化默认报告
    if (!retentionSelected.druid_datasource_id && _.get(nextProps, 'datasourceCurrent.id')) {
      return this.changeDatasource(nextProps)
    }

    //项目切换
    if (tid && nid !== tid) {
      if (ls.get(retentionChangeProjLSId)) {
        return ls.set(retentionChangeProjLSId, '')
      }
      return this.changeDatasource(nextProps)
    }

    // 因为 统计字段需要直接使用分群的统计字段，所以分群变更后，需要设置统计字段
    // 没有选择分群时，能够选择 统计字段，否则不能选择
    if (isDiffByPath(this.props, nextProps, 'location.query.usergroup_id')) {
      this.resetGroupByField(nextProps)
    }
  }
  
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffBySomePath(this.props, prevProps, ['retentions', 'retentionIdInUrl'])) {
      let { retentionIdInUrl, tempRetention } = this.props
      if (_.get(tempRetention, 'id', '') !== (retentionIdInUrl || '')) {
        this.selectRetention(retentionIdInUrl)
      }
    }
  }
  
  resetGroupByField(nextProps) {
    let commonMetric = _.get(nextProps.datasourceCurrent, 'params.commonMetric')
    if (_.isEmpty(commonMetric)) {
      return
    }
    let nextUgId = _.get(nextProps, 'location.query.usergroup_id')
    let nextUg = isBuiltinUsergroupId(nextUgId)
      ? getUsergroupByBuiltinId(nextUgId, nextProps.datasourceCurrent)
      : _.find(nextProps.usergroups, ug => ug.id === nextUgId)

    if (nextUg) {
      let nextMetricalField = nextUg.params.groupby
      nextProps.retentionUpdater('params.retentionMetricalField', () => nextMetricalField, 'no-reload')
    } else {
      nextProps.retentionUpdater('params.retentionMetricalField', () => commonMetric[0], 'no-reload')
    }
  }

  async changeDatasource(nextProps) {
    let {
      datasourceCurrent,
      retentionUpdater
    } = nextProps
    await retentionUpdater('', () => defaultRetention(datasourceCurrent))
  }

  async onDeleteRetention (retentionId) {
    let result = await retentionData.deleteRetention({id: retentionId})
    if (!result) return
    if (result.success) {
      message.success('删除成功', 2)
      let {retentionUpdater, reloadRetention} = this.props
      await reloadRetention()
      retentionUpdater('', () => ({}))
    } else {
      message.error('删除失败', 5)
    }
  }

  async saveRetention(retention = {}) {
    let {
      name
    } = retention

    if (!name) {
      message.error('保存失败: 未设置留存名称')
      return null
    }

    let {retentions} = this.props
    if (_.some(retentions || [], r => {
      return r.druid_datasource_id === retention.druid_datasource_id && r.id !== retention.id && r.name === retention.name
    })) {
      message.error('保存失败，存在重名的留存')
      return null
    }

    let result = retention.id ? await retentionData.updateRetention(retention) : await retentionData.createRetention(retention)
    if (!result) return null
    if (result && !result.success) {
      message.error('保存失败')
      return null
    }
    message.success('保存成功', 2)
    this.setState({showSavePop: false})

    let {retentionUpdater} = this.props
    PubSub.publish('retention.reload-retentions', nextRetentions => {
      if (retention.id) {
        retentionUpdater('', () => _.cloneDeep(_.find(nextRetentions, r => r.id === retention.id)))
      } else {
        retentionUpdater('', () => _.cloneDeep(nextRetentions[0]))
      }
    })
    return retention.id || _.get(result, 'data.id')
  }

  onChangeDate = ({dateType: relativeTime, dateRange: [since, until]}) => {
    //判断日期范围，14天以上将时间粒度改成周，90天以上改成月
    //此处如果列太多，表格将滚动，但andt滚动有问题，所以将30天改成14天，避免滚动
    //growing的留存表格也是对antdTable进行了进一步封装，不允许滚轮滚动，只能用按钮滚动，估计是尚有未知问题，建议参考growing做法    
    if (0 < moment(until).diff(moment(since), 'years') && relativeTime === 'custom') {
      message.error(`所选时间范围不能大于${maxDurationInYears}年,结束时间已自动切换为最大值`)
      until = moment(since).add(maxDurationInYears, 'years')
      until = moment(until).add(-1, 'days').format() //减一天，不然年对比会大过 1
      this.setState({        
        showPop: true,
        dateRange: [since, until]
      })
      return
    } else {
      let suitableGrs = findSuitableRetentionGranularity([since, until])

      this.props.retentionUpdater('params', origin => {
        return {
          ...origin,
          relativeTime,
          since,
          until,
          granularityType: _.includes(suitableGrs, origin.granularityType) ? origin.granularityType: suitableGrs[0]
        }
      }, 'no-reload')
      this.setState({
        showPop:false,
        dateRange: []
      })
    }
  }

  handleSave = async (type) => {
    const { retentionUpdater } = this.props
    const { tempName } = this.state

    let nextRet = await retentionUpdater('name', currName => tempName === undefined ? currName : tempName)
    if (type === 'update') {
      return await this.saveRetention(nextRet)
    }
    if (type === 'saveAs') {
      return await this.saveRetention(_.omit(nextRet, 'id'))
    }
  }

  renderModelConfig = withBoundaryTime(props => props.boundaryTimeFetcherProps)(props => {
    let {
      tempRetention = {},
      datasourceCurrent,
      dimensions = [],
      retentionUpdater
    } = props

    let dimDict = _.keyBy(dimensions, 'name')

    let {
      relativeTime = '-7 days',
      since,
      until,
      retentionType
    } = tempRetention.params || {}

    if (!retentionType) {
      retentionType = 'anyEvent'
    }

    let commonDimensions = _.get(datasourceCurrent, 'params.commonDimensions') || []

    let datasourceSelected = datasourceCurrent

    let [finalSince, finalUntil] = relativeTime === 'custom' ? [since, until] : convertDateType(relativeTime)
    // let hasSomeDataSources = !!dataSources[0]

    finalSince = moment(finalSince).add(-90, 'days').format()

    if (!commonDimensions || !commonDimensions.length) {
      return null
    }
    // {startStep, endStep, startStep_1, endStep_2} => [{startStep, endStep}, ...]
    let stepPairs = getStepPairs(tempRetention)

    return (
      <div className="width-100 mg1t" >
        <RadioGroup
          className="block mg2b"
          onChange={ev => {
            let val = ev.target.value
            retentionUpdater('params', p => {
              if (val === 'anyEvent') {
                return _(p)
                  .omitBy((v, k) => _.startsWith(k, 'startStep') || _.startsWith(k, 'endStep'))
                  .assign({retentionType: 'anyEvent', startStep: [], endStep: []})
                  .value()
              } else {
                return {...p, retentionType: val}
              }
            }, 'no-reload')
          }}
          value={retentionType}
        >
          <RadioButton value="anyEvent">整体留存</RadioButton>
          <RadioButton value="sameEvent">功能留存</RadioButton>
          <RadioButton value="customEvent">自定义留存</RadioButton>
        </RadioGroup>

        {stepPairs.map((p, idx) => {
          let {startStep, endStep} = p
          let prefix = _.size(stepPairs) <= 1 ? '' : `第 ${idx + 1} 组 `
          return (
            <div key={idx}>
              <div className={classNames('iblock', {hide: retentionType === 'anyEvent'})} >
                <div className="ant-form-item-label">
                  <label>{retentionType === 'sameEvent' ? `${prefix}选择功能` : `${prefix}起始行为`}</label>
                </div>
                {(commonDimensions || []).map((dimName, index) => {
                  let style = {width: (100 / startStep.length) + '%'}

                  let prevLayerValues = commonDimensions
                    .map((dimName, i) => i === index ? null : {col: dimName, val: startStep[i]}).filter(plv => plv && plv.val)

                  let dbDim = dimDict[dimName]
                  if (!dbDim) {
                    return null
                  }
                  return (
                    <SingleDistinct
                      key={index}
                      getPopupContainer={() => document.querySelector('.scroll-content')}
                      dbDim={dbDim}
                      doFetch={false}
                      since={finalSince}
                      until={finalUntil}
                      relativeTime={relativeTime}
                      dataSourceId={datasourceSelected && datasourceSelected.id || ''}
                      prevLayerValues={prevLayerValues}
                      value={startStep[index]}
                      style={style}
                      onChange={v => {
                        if (retentionType === 'sameEvent') {
                          // 同时改变 startStep 和 endStep
                          retentionUpdater('params', p => {
                            return immutateUpdates(p,
                              [`startStep${idx === 0 ? '' : `_${idx}`}`, index], () => v,
                              [`endStep${idx === 0 ? '' : `_${idx}`}`, index], () => v)
                          }, 'no-reload')
                        } else {
                          retentionUpdater(`params.startStep${idx === 0 ? '' : `_${idx}`}`, startStep => {
                            return immutateUpdate(startStep, index, () => v)
                          }, 'no-reload')
                        }
                      }}
                      showSelectAll
                      showAllowClear={false}
                      selectAllPrefix="任意"
                    />
                  )
                })}
              </div>

              <div className={classNames('iblock mg1l', {hide: retentionType !== 'customEvent'})} >
                <div className="ant-form-item-label"><label title="回访行为：">回访行为</label></div>
                {(commonDimensions || []).map((dimName, index) => {
                  let style = {width: (100 / endStep.length) + '%'}

                  let prevLayerValues = commonDimensions
                    .map((dimName, i) => i === index ? null : {col: dimName, val: endStep[i]}).filter(plv => plv && plv.val)

                  let dbDim = dimDict[dimName]
                  if (!dbDim) {
                    return null
                  }
                  return (
                    <SingleDistinct
                      key={index}
                      getPopupContainer={() => document.querySelector('.scroll-content')}
                      dbDim={dbDim}
                      doFetch={false}
                      since={finalSince}
                      until={finalUntil}
                      dataSourceId={datasourceSelected && datasourceSelected.id || ''}
                      prevLayerValues={prevLayerValues}
                      value={endStep[index]}
                      style={style}
                      onChange={v => {
                        retentionUpdater(`params.endStep${idx === 0 ? '' : `_${idx}`}`, endStep => {
                          return immutateUpdate(endStep, index, () => v)
                        }, 'no-reload')
                      }}
                      showSelectAll
                      showAllowClear={false}
                      selectAllPrefix="任意"
                    />
                  )
                })}
              </div>

              {idx === 0
                ? (
                  <Tooltip title="添加对比">
                    <PlusCircleOutlined
                      className={classNames('pointer font18', {
                        hide: retentionType === 'anyEvent',
                        disabled: 3 <= _.size(stepPairs)
                      })}
                      onClick={() => {
                        if (3 <= _.size(stepPairs)) {
                          return
                        }
                        let toInsertIdx = stepPairs.length
                        retentionUpdater('params', params => {
                          return {
                            ...params,
                            [`startStep_${toInsertIdx}`]: [],
                            [`endStep_${toInsertIdx}`]: []
                          }
                        }, 'no-reload')
                      }} />
                  </Tooltip>
                )
                : (
                  <Tooltip titlle="移除对比">
                    <MinusCircleOutlined
                      className={classNames('pointer font18', {hide: retentionType === 'anyEvent'})}
                      onClick={() => {
                        // 需要调整后面所有项的 key
                        retentionUpdater('params', params => {
                          return _(params)
                            .omit([`startStep_${idx}`, `endStep_${idx}`])
                            .mapKeys((v, k) => {
                              if (_.startsWith(k, 'startStep_') || _.startsWith(k, 'endStep_')) {
                                let [type, idx0] = k.split('_')
                                if (idx < +idx0) {
                                  return `${type}_${idx0 - 1}`
                                }
                              }
                              return k
                            }).value()
                        }, 'no-reload')
                      }} />
                  </Tooltip>
                )}
            </div>
          );
        })
        }
      </div>
    );
  })

  renderBasicFilter = () => {
    let {
      projectCurrent,
      datasourceCurrent,
      retentionSelected = {},
      retentionUpdater,
      dataSourceDimensions: dbDims,
      doReload,
      tempRetention
    } = this.props

    if (!tempRetention.druid_datasource_id) {
      return
    }
    let {
      commonMetric = []
    } = datasourceCurrent && datasourceCurrent.params || {}

    let {
      retentionMetricalField = commonMetric[0],
      relativeTime = '-7 days',
      since,
      until,
      extraFilters
    } = tempRetention.params || {}

    let dimensionsDict = dictBy(dbDims.filter(dim => dim.title), dim => dim.name, dim => dim.title)

    let [finalSince, finalUntil] = relativeTime === 'custom'
      ? [since, until]
      : convertDateType(relativeTime)

    let dataSourceId = datasourceCurrent && datasourceCurrent.id || ''
    return (
      <div className="pd3x pd2y">
        {
          this.renderModelConfig({
            retentionSelected: retentionSelected,
            tempRetention: tempRetention,
            datasourceCurrent: datasourceCurrent,
            retentionUpdater: retentionUpdater,
            dimensions: dbDims,
            doReload: doReload,
            boundaryTimeFetcherProps: {
              dataSourceId: dataSourceId,
              doFetch: !!dataSourceId,
              doQueryMinTime: false,
              onTimeLoaded: (data) => {
                let {maxTime} = data || {}
                let currRelativeTime = _.get(tempRetention, 'params.relativeTime')
                if (currRelativeTime === '-7 day' && moment(maxTime).isBefore(moment().add(-7, 'days').startOf('day'))) {
                  let finalUntil = moment(maxTime).add(1, 'day').startOf('day')
                  let finalSince = moment(finalUntil).add(-7, 'day')
                  retentionUpdater('params', origin => {
                    return {
                      ...origin,
                      relativeTime: 'custom',
                      since: finalSince.format('YYYY-MM-DD'),
                      until: finalUntil.format('YYYY-MM-DD'),
                      granularityType: 'P1D'
                    }
                  }, 'no-reload')
                }
              }
            }
          })
        }

        <div className="mg2t">
          <CommonDruidFilterPanel
            getPopupContainer={() => document.querySelector('.scroll-content')}
            className="itblock"
            projectId={projectCurrent.id}
            dataSourceId={projectCurrent.datasource_id}
            timePickerProps={{
              onChange: this.onChangeDate,
              dateType: relativeTime,
              dateRange: 0 < this.state.dateRange.length ? this.state.dateRange : [finalSince, finalUntil],
              showPop: this.state.showPop,
              className: 'itblock width260 fleft mg1r'
            }}
            filters={extraFilters}
            onFiltersChange={nextFilters => {
              retentionUpdater('params.extraFilters', () => nextFilters, 'no-reload')
            }}
          />

          {this.renderMetricalFieldSelector({retentionMetricalField, dimensionsDict})}
        </div>

        <Button
          type="primary"
          className="mg2t width120"
          icon={<SearchOutlined />}
          onClick={doReload}
        >查询</Button>
      </div>
    );
  }
  
  renderMetricalFieldSelector({retentionMetricalField, dimensionsDict}) {
    let { datasourceCurrent, retentionUpdater } = this.props
    let commonMetric = _.get(datasourceCurrent, 'params.commonMetric') || []
    if (_.size(commonMetric) <= 1) {
      return null
    }
    let currUserGroupId = _.get(this.props, 'location.query.usergroup_id')
    if (currUserGroupId && currUserGroupId !== 'all' && currUserGroupId !== BuiltinUserGroup.newVisitUsers) {
      // 没有选择分群时，才能够选择 统计字段，否则不能选择
      return
    }
    let idTipContent = (
      <div className="pd2">
        <p>选择
          {commonMetric.map((t, i) => <b className="color-green" key={i}>{i ? ', ' : ''}{dimensionsDict[t] || t}</b>)}
          中的一种标识访问用户的ID</p>
      </div>
    )
    
    return (
      <div className="fright">
        <div className="itblock mg1r line-height28">切换用户类型为</div>
        <Select
          {...enableSelectSearch}
          placeholder="未设置用户类型"
          className="width160"
          onChange={val => {
            retentionUpdater('params.retentionMetricalField', () => val, 'no-reload')
          }}
          value={retentionMetricalField}
          getPopupContainer={() => document.querySelector('.scroll-content')}
        >
          {commonMetric.map(cm => {
            return (
              <Option key={cm} value={cm}>{dimensionsDict[cm] || cm}</Option>
            )
          })}
        </Select>
        <Popover
          content={idTipContent}
          placement="right"
        >
          <div className="iblock mg1l font16 line-height28">
            <QuestionCircleOutlined />
          </div>
        </Popover>
      </div>
    );
  }
  
  renderSaveSlicePopover() {
    let { tempRetention, datasourceCurrent } = this.props
  
    const { tempName } = this.state
    const tempSliceName = tempName === undefined ? `留存 ${tempRetention.name || '未命名留存'} 的关联单图` : tempName
    return (
      <Tabs className="width300" >
        <TabPane tab="另存为新单图" key="saveAs">
          <Row>
            <Col className="pd1" span={24}>单图名称</Col>
            <Col className="pd1" span={24}>
              <Input
                value={tempSliceName}
                className="width-100"
                onChange={ev => this.setState({tempName: ev.target.value})}
                placeholder="未输入名称"
              />
            </Col>
            <Col className="pd1 alignright" span={24}>
              <Button
                icon={<SaveOutlined />}
                type="primary"
                className="width-100"
                onClick={async () => {
                  let { id: retentionId } = tempRetention
                  let isCreating = !retentionId
                  if (isCreating) {
                    // 根据单图名称解析出留存名
                    let retentionName = _.trim(tempSliceName.replace(/^留存|的关联单图$/g, '')) || '未命名留存'
                    await new Promise(resolve => this.setState({tempName: retentionName}, resolve))
                  }
                  retentionId = isCreating ? await this.handleSave('saveAs') : retentionId
                  if (!retentionId) {
                    return
                  }
                  let createSliceRes = await Fetch.post('/app/slices/create/slices', {
                    druid_datasource_id: datasourceCurrent.id,
                    slice_name: tempSliceName,
                    params: {
                      vizType: 'sugo_retention',
                      openWith: 'SugoRetention',
                      chartExtraSettings: { relatedRetentionId: retentionId }
                    }
                  })
                  if (createSliceRes) {
                    message.success('保存单图成功')
                  }
                }}
              >保存</Button>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    );
  }
  
  selectRetention = async (rid) => {
    let { retentionUpdater, retentions, retentionIdInUrl } = this.props
    let nextRet = rid && _.cloneDeep(_.find(retentions, r => r.id === rid)) || {}
    await retentionUpdater('', () => nextRet)
    if (rid && !_.isEmpty(nextRet)) {
      this.props.doReload()
    }
    if ((rid || '') !== (retentionIdInUrl || '')) {
      browserHistory.push(`/console/retention/${rid}`)
    }
  }

  render() {
    let {
      datasourceCurrent,
      retentions,
      tempRetention
    } = this.props

    let { id: retentionId } = tempRetention

    const { tempName } = this.state

    let retentionsAll = [
      {
        id: '',
        name: '请选择'
      },
      ...retentions.filter(p => p.druid_datasource_id === datasourceCurrent.id)
    ]
    const retentionSelect = [
      <span key="report">常用留存：</span>,
      <Select
        key="retentionPicker"
        value={retentionId || ''}
        onChange={this.selectRetention}
        placeholder="请选择"
        style={{width: 200, marginRight: 10}}
        showSearch
        optionFilterProp="children"
        notFoundContent="查无内容"
        dropdownMatchSelectWidth={false}
        getPopupContainer={() => document.querySelector('.scroll-content')}
      >
        {retentionsAll.map(retention => {
          return (
            <Option value={retention.id} key={retention.id}>{retention.name}</Option>
          )
        })}
      </Select>
    ]

    let isCreating = !tempRetention.id
    let tabs = canCreateRetension ? [
      <TabPane tab="另存为新留存" key="saveAs">
        <Row>
          <Col className="pd1" span={24}>留存名称</Col>
          <Col className="pd1" span={24}>
            <Input
              value={tempName === undefined ? tempRetention.name : tempName}
              className="width-100"
              onChange={ev => this.setState({tempName: ev.target.value})}
              placeholder="未输入名称"
            />
          </Col>
          <Col className="pd1 alignright" span={24}>
            <Button
              icon={<SaveOutlined />}
              type="primary"
              className="width-100"
              onClick={() => this.handleSave('saveAs')}
            >保存</Button>
          </Col>
        </Row>
      </TabPane>
    ] : []

    if (canEditRetension && tempRetention.id) {
      tabs.unshift(
        <TabPane tab="更新当前留存" key="update">
          <Row>
            <Col className="pd1" span={24}>留存名称</Col>
            <Col className="pd1" span={24}>
              <Input
                value={tempName === undefined ? tempRetention.name : tempName}
                className="width-100"
                onChange={ev => this.setState({tempName: ev.target.value})}
                placeholder="未输入名称"
              />
            </Col>
            <Col className="pd1 alignright" span={24}>
              <Button
                icon={<SaveOutlined />}
                type="primary"
                className="width-100"
                onClick={() => this.handleSave('update')}
              >更新</Button>
            </Col>
          </Row>
        </TabPane>
      )
    }

    let saveRetentionPop = (
      <Tabs
        key={retentionId}
        defaultActiveKey={isCreating || !canEditRetension ? 'saveAs' : 'update'}
        className="width300"
      >
        {tabs}
      </Tabs>
    )
  
    return (
      <div className="">
        <div className="pd3x mg2t">
          <div className="fix">
            <div className="fleft">
              <div className="iblock ">{retentionSelect}</div>
            </div>
            <div className="fright">
              <Auth auth="post:/app/slices/create/slices">
                <Popover
                  content={this.renderSaveSlicePopover()}
                  placement="bottomRight"
                >
                  <Button
                    type="success"
                    className={classNames('iblock mg1r', {hide: !enableSaveSliceEnhance})}
                    icon={<SaveOutlined />}
                  >保存为单图</Button>
                </Popover>
              </Auth>
  
              {
                canEditRetension && tempRetention.id || canCreateRetension
                  ? <Popover
                    content={saveRetentionPop}
                    placement="bottomRight"
                    >
                    <Button
                      type="success"
                      className="iblock mg1r"
                      icon={<SaveOutlined />}
                    >
                      {isCreating ? '保存为常用留存' : '保存'}
                    </Button>
                  </Popover>
                  : null
              }
              {
                canDelRetension && tempRetention.id
                  ? <Popconfirm title="确定要删除这个留存吗？" onConfirm={() => this.onDeleteRetention(retentionId)}>
                    <Button icon={<CloseOutlined />} className="itblock">删除</Button>
                  </Popconfirm>
                  : null
              }
            </div>
          </div>
        </div>
      
        {this.renderBasicFilter()}
      </div>
    );
  }
}

