import React from 'react'
import PropTypes from 'prop-types'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import _ from 'lodash'
import {DruidColumnTypeInverted, isTimeDimension} from '../../../common/druid-column-type'
import {immutateUpdate} from '../../../common/sugo-utils'
import { DeleteOutlined, MinusCircleOutlined, PlusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Select, Row, Col, Input, message, Table } from 'antd';
import {withDbDims} from '../Fetcher/data-source-dimensions-fetcher'
import {withApps} from '../Fetcher/app-fetcher'
import {AccessDataOriginalType} from '../../../common/constants'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import * as actions from '../../actions'

const {Option} = Select

const mapDispatchToProps = dispatch => bindActionCreators(actions, dispatch)

const defaultDimFilter = dbDim => dbDim.name !== '__time' && !_.get(dbDim.params, 'type')

//初始化数据
const getItems = count =>
  Array.from({ length: count }, (v, k) => k).map(k => ({
    id: `item-${k + 1}`,
    content: `this is content ${k + 1}`
  }))

// 重新记录数组顺序
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list)

  const [removed] = result.splice(startIndex, 1)

  result.splice(endIndex, 0, removed)
  return result
}


// 设置样式
const getItemStyle = (isDragging, draggableStyle) => ({
  userSelect: 'none',
  ...draggableStyle
})


@withApps(props => {
  return {
    projectId: props.projectId,
    doFetch: !!props.projectId
  }
})
@withDbDims(props => {
  let {dataSourceId, dimensionOptionFilter = defaultDimFilter} = props
  return {
    dataSourceId: dataSourceId,
    doFetch: !!dataSourceId,
    datasourceType: 'all',
    resultFilter: dimensionOptionFilter
  }
})
@connect(state => {
  const dimensions = _.get(state, 'common.dimensions', [])
  const dimensionsNameMap = {}
  dimensions.map( i => {
    if (!dimensionsNameMap[i.name]) dimensionsNameMap[i.name] = i
  })
  return {
    dimensions,
    dimensionsNameMap
  }
}, mapDispatchToProps)
class CommonDruidFieldPanel extends React.Component {
  
  constructor(props) {
    super(props)
    this.state = {
      items: props.settings
    }
  }

  componentWillReceiveProps(nextProps) {
    let {settings} = nextProps
    if (!_.isEqual(this.props.settings, settings)){
      this.setState({
        items: settings
      })
    }
  }


  onDragEnd = (result) => {
    if (!result.destination) {
      return
    }

    const items = reorder(
      this.state.items,
      result.source.index,
      result.destination.index
    )
    this.props.onSettingsChange(items)
    this.setState({
      items
    })
  }

  componentDidMount() {
    if (!this.props.projectId) return 
    this.props.getDimensions(this.props.projectId)
  }

  onAppendFilter = () => {
    let { settings, onSettingsChange, dashboards, slice} = this.props
    let dimensions = _.get(slice, 'params.dimensions', [])
    dashboards = dashboards.filter(item => {
      return !_.find(settings, {id: item.id})
    })
    let dashboard = dashboards[0]
    if (!dashboard) {
      message.warn('没有看板可选')
      return
    }
    let nextsettings = [...settings, {
      triggerParameters: _.get(slice, 'params.metrics[0]', ''),
      id: dashboard.id,
      carryParams: slice.params.dimensions || [],
      dimensions
    }]
    onSettingsChange(nextsettings)
  }

  renderSettingsTile = ({set, idx, dbDimDict, className}) => {
    let {
      dataSourceDimensions, settings, getPopupContainer, onSettingsChange,  dashboards, slice, dimensionsNameMap
    } = this.props
    let { id, carryParams, triggerParameters } = set
    let metrics = _.get(slice, 'params.metrics', [])
    let dimensions = _.get(slice, 'params.dimensions', [])
    //触发参数，vizTypes里面的单图可以选择指标和维度
    let vizTypes = ['table_flat', 'table']
    let vizType = _.get(slice, 'params.vizType', '')
    metrics = _.includes(vizTypes, vizType) ? _.concat(metrics, dimensions) : metrics
    let jumpdashboard = _.find(dashboards, {id}) || {}
    return (
      <div
        id={id}
        key={idx}
        className={className+' relative border pd1 alignleft'}
      >
        {
          false 
            ? <div>
              <span>跳转触发参数：</span><Select
                size="middle"
                className="width120 iblock mg1r"
                {...enableSelectSearch}
                dropdownMatchSelectWidth={false}
                value={triggerParameters || undefined}
                placeholder="请选择参数"
                getPopupContainer={getPopupContainer}
                onChange={val => {
                  onSettingsChange(immutateUpdate(settings, [idx], prevFilter => {
                    return {
                      ...prevFilter,
                      triggerParameters: val
                    }
                  }))
                }}
                                  >
                {metrics.map((metric,index) => {
                  return (
                    <Option key={index} value={metric}>{metric}</Option>
                  )
                })}
              </Select>
            </div>
            : null
        }
        <div>
          <span>跳转目标看板：</span><Select
            size="middle"
            className="width120 iblock mg1r"
            {...enableSelectSearch}
            dropdownMatchSelectWidth={false}
            value={jumpdashboard.dashboard_title || undefined}
            placeholder="请选择目标看板"
            getPopupContainer={getPopupContainer}
            onChange={val => {
              onSettingsChange(immutateUpdate(settings, [idx], prevFilter => {
                return {
                  ...prevFilter,
                  id: val
                }
              }))
            }}
                              >
            {dashboards.map(dashboard => {
              if (_.find(settings, {id: dashboard.id})) return null
              return (
                <Option key={dashboard.id} value={dashboard.id}>{dashboard.dashboard_title}</Option>
              )
            })}
          </Select>
        </div>
        <div>
          <span>跳转携带参数：</span>
          <div className="itblock relative">     
            {
              carryParams.map((carryParam, index) => {
                return (
                  <div
                    key={index}
                  >
                    <Select
                      size="middle"
                      className="width120 iblock mg1r"
                      {...enableSelectSearch}
                      dropdownMatchSelectWidth={false}
                      value={carryParam || undefined}
                      placeholder="请选择参数"
                      getPopupContainer={getPopupContainer}
                      onChange={val => {
                        if (_.indexOf(settings[idx].carryParams, val) >= 0) {
                          message.warn('已经被选择了')
                          return null
                        }
                        onSettingsChange(immutateUpdate(settings, [idx], prevFilter => {
                          return {
                            ...prevFilter,
                            carryParams: prevFilter.carryParams.map((p, i)=>{
                              return i === index ? val : p
                            })
                          }
                        }))
                      }}
                    >
                      {dimensions.map((dbDim0, i) => {
                        return (
                          <Option key={i} value={dbDim0}>{_.isEmpty(_.get(dimensionsNameMap[dbDim0], 'title')) 
                            ? dbDim0 : _.get(dimensionsNameMap[dbDim0], 'title')}</Option>
                        )
                      })}
                    </Select>
                    <div className="itblock width30 alignCenter">
                      <MinusCircleOutlined
                        title="移除"
                        className="color-grey font16 pointer line-height32 hover-color-red"
                        data-carry-params-index={index}
                        data-settings-idx={idx}
                        onClick={()=>{this.onRemoveCarryParamsClick(id, carryParam)}} />
                    </div>
                  </div>
                );
              })
            }
            <div >
              <PlusOutlined
                title="添加"
                className="color-grey font16 pointer line-height32 hover-color-red"
                data-settings-idx={idx}
                onClick={()=>{this.onAddCarryParamsClick(id)}} />
              <span className="pointer" onClick={()=>{this.onAddCarryParamsClick(id)}}>添加参数</span>
            </div>
          </div>
        </div>
        <div className="itblock width30 absolute top1 right2">
          <DeleteOutlined
            title="移除这个跳转配置"
            className="color-grey font16 pointer line-height32 hover-color-red"
            data-filter-idx={idx}
            onClick={()=>{this.onRemoveSettingsClick(id)}} />
        </div>
      </div>
    );
  }

  onRemoveSettingsClick = id => {
    //let settingsIdx = +ev.target.getAttribute('data-filter-idx')
    let {settings, onSettingsChange} = this.props
    onSettingsChange(settings.filter((f, i) => f.id !== id))
  }

  onRemoveCarryParamsClick = (id, carryParam) => {
    let {settings, onSettingsChange} = this.props
    onSettingsChange(settings.map((f, i) => {
      return f.id !== id ? f : {...f, carryParams: _.without(f.carryParams, carryParam)}
    }))
  }

  onAddCarryParamsClick = id => {
    let { slice } = this.props
    let dimensions = _.get(slice, 'params.dimensions', [])
    if (_.isEmpty(dimensions)) {
      message.warn('没有可选维度')
      return null
    }
    let {settings, onSettingsChange} = this.props
    onSettingsChange(settings.map((f, i) => {
      let newParam = (_.difference(dimensions, f.carryParams))[0]
      if (_.isEmpty(newParam)) {
        message.warn('所有维度已经被选择，没有可选维度')
        return f
      }
      return f.id !== id ? f : {...f, carryParams: [...f.carryParams, newParam]}
    }))
  }
  render() {
    let {
      settings,
      dataSourceDimensions,
      noDefaultDimension,
      className, style, timePickerProps, onSettingsChange
    } = this.props

    let dbDimDict = _.keyBy(dataSourceDimensions, 'name')
    if (!timePickerProps && !settings.length && dataSourceDimensions.length && noDefaultDimension) {
      if (!dataSourceDimensions[0]) {
        message.error('没有属性项可选')
        return
      }
      let dbDim = dataSourceDimensions[0]
      settings = [{
        col: undefined,
        type: DruidColumnTypeInverted[dbDim.type],
        name: ''
      }]
      onSettingsChange(settings)
    }
    return (
      <div className={className} style={style}>
        <DragDropContext onDragEnd={this.onDragEnd}>
          <center>
            <Droppable droppableId="droppable">
              {(provided, snapshot) => (
                <div
                  //provided.droppableProps应用的相同元素.
                  {...provided.droppableProps}
                  // 为了使 droppable 能够正常工作必须 绑定到最高可能的DOM节点中provided.innerRef.
                  ref={provided.innerRef}
                >
                  {this.state.items.map((set, idx) => (
                    <Draggable key={set.id} draggableId={set.id} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={getItemStyle(
                            snapshot.isDragging,
                            provided.draggableProps.style
                          )}
                        >
                          {
                            this.renderSettingsTile({
                              key: idx,
                              set,
                              idx,
                              dbDimDict,
                              className: idx !== settings.length - 1 ? 'mg1b' : undefined,
                              settings
                            })
                          }
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </center>
        </DragDropContext>
        {
          // <div className="mg1b" id="jump">
          //   {(settings || []).map((set, idx) => {
          //     return this.renderSettingsTile({
          //       key: idx,
          //       set,
          //       idx,
          //       dbDimDict,
          //       className: idx !== settings.length - 1 ? 'mg1b' : undefined,
          //       settings
          //     })
          //   })}
          // </div>
        }
        <div className="pd1t">
          <span
            className="pointer color-black font12"
            onClick={this.onAppendFilter}
            title="新增跳转配置"
          >
            <PlusCircleOutlined className="mg1r color-green font14" />
            新增跳转配置
          </span>
        </div>
      </div>
    );
  }
}

CommonDruidFieldPanel.propTypes ={
  className: PropTypes.any,
  style: PropTypes.object,
  timePickerProps: PropTypes.object,
  settings: PropTypes.array.isRequired,
  dataSourceDimensions: PropTypes.array,
  noDefaultDimension: PropTypes.bool,
  onSettingsChange: PropTypes.func
}

export default CommonDruidFieldPanel
