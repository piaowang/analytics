/**
 * 行为事件分析全局设置保存面板
 */
import React, { Component } from 'react'
import _ from 'lodash'
import { DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import {
  Button,
  Row,
  Col,
  Select,
  Popover,
  Tabs,
  Input,
  Popconfirm,
  message,
  Checkbox,
  Affix,
} from 'antd';
import {browserHistory} from 'react-router'
import moment from 'moment'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import DateRangePicker from '../Common/time-picker'
import {isRelative} from '../../../common/param-transform'
import FilterCol from '../TrafficAnalytics/filter-col'
import conditions from '../TrafficAnalytics/condition-definition'
import {getTimeRange, clearDay} from '../TrafficAnalytics/data-box'
import {getTypeFilter} from './data-table'
import {checkPermission} from '../../common/permission-control'

const canCreate = checkPermission('post:/app/behavior-analytics/models')
const canEdit = checkPermission('put:/app/behavior-analytics/models/:modelId')
const canDelete = checkPermission('delete:/app/behavior-analytics/models/:modelId')

const FormItem = Form.Item
const TabPane = Tabs.TabPane
const {Option} = Select

const URL = '/console/behavior-analytics'

const getPopupContainer = () => document.querySelector('.overscroll-y')

export function createEmptyModel(dsId, metricalField = 'distinct_id') {
  return {
    id: '',
    name: '默认报告',
    druid_datasource_id: dsId,
    params: {
      filterCols: ['device', 'system', 'browser'],
      metricalField: metricalField,
      filterDict: {
        'event_type': {
          col: 'event_type', 
          op: 'in', 
          eq: ['点击']
        }
      },
      timeFilter: {
        dateType: '-1 day',
        dateRange: []
      },
      eventName: '点击',
      chartBoxSetting: {
        timeFilter: {
          dateType: ['-1 days startOf day', 'startOf day -1 ms'],
          dateRange: []
        },
        granularity: 'PT1H',
        selectMetric: 'eventCount'
      }
    }
  }
}

class SettingPanel extends Component {
  state = {
    tempName: undefined
  }
  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.models, this.props.models)) {
      this.setState({tempName: undefined})
    }
  }

  shouldComponentUpdate() {
    let {model, onChange, models, modelId} = this.props

    if(!model.id && models && models.length) {
      let _model = null
      if(modelId) {
        if(!this._defaultId) {
          _model = models.find(mo => mo.id === modelId)
          this._defaultId = modelId
        }
      } else {
        models = models.filter(m => m.druid_datasource_id === model.druid_datasource_id)
        _model = models[0]
      }
      
      if(_model) {
        onChange('', _model)
        model = _model
        return false
      }
    }

    return true
  }

  componentDidUpdate(prevProps) {
    const {model} = this.props
    const {model: oldModel} = prevProps
    if(oldModel.id !== model.id) {
      browserHistory.replace(`${URL}/${model.id}`)
    }
  }

  getCommonMetricFromCurrDataSource() {
    const {dataSources, model} = this.props
    let {druid_datasource_id} = model || {}
    let dsOfModel = _.find(dataSources, ds => ds.id === druid_datasource_id)
    return _.get(dsOfModel, 'params.commonMetric') || []
  }

  onSaveModel = async (type) => {
    let {addModel, updateModel, reloadModels, model, onChange} = this.props
    let {tempName} = this.state
    let {id: modelId, ...rest} = model || {}
    let nextName = _.trim(tempName) || rest.name
    if (!nextName) {
      message.error('请先填写名称')
      return
    }
    if (!model.druid_datasource_id) {
      message.error('请先选择所属项目')
      return
    }
    if (type === 'update') {
      let res = null
      if(!modelId) {
        res = await addModel({...rest, name: nextName})
        modelId = res.result.id
      } else {
        res = await updateModel(modelId, {...rest, name: nextName})
      }
      if (!res || res.error) {
        // message.error('更新失败，请重试')
        return
      }
      message.success('更新成功')
      await reloadModels()
    } else if (type === 'saveAs') {
      if(!modelId) {
        let newModel = createEmptyModel(rest.druid_datasource_id)
        delete newModel.id
        addModel(newModel)
      }
      let res = await addModel({...rest, name: nextName})
      if (!res || res.error) {
        // message.error('保存失败，请重试')
        return
      }
      message.success('保存成功')
      modelId = res.result.id
      const models = await reloadModels()
      model = (models.result || []).find(m => m.id === modelId)
      model ? onChange('', model) : null
    } else {
      throw new Error(`Unknown type: ${type}`)
    }
  }

  onDeleteModel = async () => {
    const {model = {}} = this.props
    let {id: modelId} = model
    let {deleteModel, reloadModels} = this.props
    let res = await deleteModel(modelId)
    if (!res || res.error) {
      message.error('删除失败，请重试')
      return
    }
    message.success('删除成功')
    await reloadModels()
  }

  renderCondition() {
    const {model, onChange, dataSourceDimensions} = this.props
    let {filterCols} = model && model.params || {}
    let selectedFilterColSet = new Set(filterCols)
    let conditionDom = []
    let group = 0

    // 修正没有 condition 中的维度时，点击条件报错的 bug
    let dbNameSet = new Set(dataSourceDimensions && dataSourceDimensions.map(d => d.name) || [])
    conditions.filter(c => _.every(c.dimensions, dimName => dbNameSet.has(dimName))).forEach((co, i) => {
      if(group !== co.group) {
        group = co.group
        conditionDom.push(<br key={i}/>)
      }
      conditionDom.push(
        <Checkbox
          onChange={ev => {
            if (ev.target.checked) {
              if(filterCols.length < 6) {
                onChange('params.filterCols', prevMetrics => [...prevMetrics, co.name])                
              } else {
                message.error('最多可同时选择 6 个')
              }
            } else {
              onChange('params.filterCols', prevMetrics => prevMetrics.filter(m => m !== co.name))
            }
          }}
          key={co.name}
          checked={selectedFilterColSet.has(co.name)}
        >{co.title}</Checkbox>
      )
    })

    return <div className="line-height30">{conditionDom}</div>
  }

  timeChange = timeFilter => {
    const {dateType} = timeFilter
    let [since, until] = getTimeRange(timeFilter)
    if(dateType === 'custom') {
      [since, until] = timeFilter.dateRange = clearDay([since, until])
    }
    
    this.props.onChange('params.timeFilter', timeFilter)
  }

  getColFilters() {
    const {model} = this.props
    const {timeFilter} = model.params
    return [
      {col: '__time', op: 'in', eq: getTimeRange(timeFilter)},
      ...getTypeFilter(model)
    ]
  }

  renderTimepicker() {
    const {model, onChange, dataSources, dataSourceDimensions} = this.props
    const {timeFilter, filterDict} = model.params
    const {dateType} = timeFilter
    let relativeTime = isRelative(dateType) ? dateType : 'custom'
    let [since, until] = getTimeRange(timeFilter)

    // 修正没有 condition 中的维度时，点击条件报错的 bug
    let dbNameSet = new Set(dataSourceDimensions && dataSourceDimensions.map(d => d.name) || [])
    let condNameDict = _.keyBy(conditions.filter(c => _.every(c.dimensions, dimName => dbNameSet.has(dimName))), 'name')

    let cons = _.get(model, 'params.filterCols', []).map(name => condNameDict[name]).filter(_.identity)

    let dataSource = dataSources.find(ds => ds.id === model.druid_datasource_id) || {}
    return (
      <div className="pd2x pd1t bordert dashed bg-white">
        <DateRangePicker
          getPopupContainer={getPopupContainer}
          className="height-100 width250 mg2r mg1b"
          prefix={''}
          alwaysShowRange
          hideCustomSelection
          dateType={relativeTime}
          dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
          onChange={this.timeChange}
        />
        <Popover
          getPopupContainer={getPopupContainer}
          content={this.renderCondition()} 
          title="提示：可同时选择6项"
          trigger="click"
          placement="bottom"
          overlayClassName="condition"
        >
          <Button
            className="color-purple border-purple noradius mg2r"
            style={{verticalAlign: 'top'}}
          >自定义筛选条件</Button>
        </Popover>
        {cons.map(con => (
          <FilterCol
            getPopupContainer={getPopupContainer}
            key={con.name}
            condition={con} 
            value={filterDict[con.name]}
            dbDimensions={dataSourceDimensions}
            dataSource={dataSource}
            topNFilters={this.getColFilters()}
            onChange={filters => onChange(`params.filterDict.${con.name}`, filters)}
          />)
        )}
      </div>
    )
  }

  renderTypeFilter() {
    const path = 'params.filterDict._pageName'
    const {model, onChange, dataSources, dataSourceDimensions} = this.props
    const value = _.get(model, path)

    let dataSource = dataSources.find(ds => ds.id === model.druid_datasource_id) || {}
    let con = _.get(model, 'params.eventName') === '浏览' ? {
      name: 'pageName',
      title: '页面名称',
      dimensions: ['page_name'],
      dimensionDes: ['参与分析的页面']
    } : {
      name: 'event_name',
      title: '控件名称',
      dimensions: ['event_name'],
      dimensionDes: ['参与分析的控件']
    }
    
    return (
      <FilterCol
        getPopupContainer={getPopupContainer}
        condition={con} 
        value={value}
        dbDimensions={dataSourceDimensions}
        dataSource={dataSource}
        topNFilters={this.getColFilters()}
        onChange={filters => onChange(path, filters)}
        className="itblock mg2r noradius border height29"
      />
    )
  }
  
  render() {
    const {dataSourceDimensions, model, onChange, isFetchingDataSources, models} = this.props
    const {tempName} = this.state

    let commonMetrics = this.getCommonMetricFromCurrDataSource()
    const _models = models.filter(m => m.druid_datasource_id === model.druid_datasource_id)

    let {id: modelId, name: currModelName} = model || {}
    // let canSaveOnly = !modelId

    let dbDimNameDict = _.keyBy(dataSourceDimensions || [], 'name')

    let savePop = (
      <Tabs className="width300">
        {!(canEdit && modelId) ? null : (
          <TabPane tab="更新当前报告" key="update">
            <Row>
              <Col className="pd1" span={24}>报告名称</Col>
              <Col className="pd1" span={24}>
                <Input
                  value={tempName === undefined ? currModelName : tempName}
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
                    await this.onSaveModel('update')
                    this.setState({showSavingModel: false})
                  }}
                >更新</Button>
              </Col>
            </Row>
          </TabPane>
        )}

        {!canCreate ? null : (
          <TabPane tab="另存为新报告" key="saveAs">
            <Row>
              <Col className="pd1" span={24}>报告名称</Col>
              <Col className="pd1" span={24}>
                <Input
                  value={tempName === undefined ? currModelName : tempName}
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
                    await this.onSaveModel('saveAs')
                    this.setState({showSavingModel: false})
                  }}
                >保存</Button>
              </Col>
            </Row>
          </TabPane>
        )}
      </Tabs>
    )

    return (
      <section className="borderb">
        <Form
          layout="inline"
          className="pd2x pd1y"
        >
          
          <FormItem label="常用报告" >
            <Select
              getPopupContainer={getPopupContainer}
              {...enableSelectSearch}
              dropdownMatchSelectWidth={false}
              disabled={isFetchingDataSources}
              className="width220"
              placeholder="未选择报告"
              value={modelId || model.name}
              onChange={modelId => {
                onChange('', models.find(mo => mo.id === modelId))
              }}
            >
              {_models.map(model => {
                return (
                  <Option
                    key={model.id}
                    value={model.id}
                  >{model.name}</Option>
                )
              })}
            </Select>
          </FormItem>

          <div className="fright" style={{marginRight: '0px'}}>
            {canCreate || (canEdit && modelId) ? (
              <Popover
                getPopupContainer={getPopupContainer}
                key={modelId || 'temp'}
                content={savePop}
              >
                <Button
                  type="success"
                  icon={<SaveOutlined />}
                >保存</Button>
              </Popover>
            ) : null}
            {!canDelete ? null : (
              <Popconfirm
                getPopupContainer={getPopupContainer}
                title="确定删除当前报告？"
                onConfirm={this.onDeleteModel}
              >
                <Button
                  type="danger"
                  icon={<DeleteOutlined />}
                  className="mg1r mg3l"
                  disabled={!modelId || _models && _models.length < 2}
                >删除</Button>
              </Popconfirm>
            )}
          </div>
        </Form>
        <Affix target={() => this.context.mainBody}>
          {this.renderTimepicker()}
        </Affix>
        <Form
          layout="inline"
          className="pd2x bordert dashed pd1y"
        >
          <FormItem
            className="mg2r"
            label="分析的行为事件："
            colon={false}
          >
            <Select
              getPopupContainer={getPopupContainer}
              {...enableSelectSearch}
              dropdownMatchSelectWidth={false}
              disabled={isFetchingDataSources}
              className="width180 height30 noradius"
              placeholder="分析的行为事件"
              value={_.get(model, 'params.eventName') || '点击'}
              onChange={val => onChange('params.eventName', val)}
            >
              {['点击', '对焦', '浏览'].map(eventName => <Option key={eventName} value={eventName} >{eventName}</Option>)}
            </Select>
          </FormItem>
          {this.renderTypeFilter()}
          <FormItem
            className="fright"
            style={{marginRight: '0px'}}
            label={<span className="color-999999">切换用户类型为：</span>}
            colon={false}
          >
            <Select
              getPopupContainer={getPopupContainer}
              {...enableSelectSearch}
              dropdownMatchSelectWidth={false}
              disabled={isFetchingDataSources}
              className="width180 height30 noradius"
              placeholder="用户唯一ID"
              value={_.get(model, 'params.metricalField') || undefined}
              onChange={val => onChange('params.metricalField', val)}
            >
              {commonMetrics.map(dimName => {
                let dbDim = dbDimNameDict[dimName]
                return (
                  <Option
                    key={dimName}
                    value={dimName}
                  >{dbDim && dbDim.title || dimName}</Option>
                )
              })}
            </Select>
          </FormItem>
        </Form>
      </section>
    );
  }
}

SettingPanel.contextTypes = {
  mainBody: React.PropTypes.any
}

export default SettingPanel
