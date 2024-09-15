import React, { Component } from 'react'
import { connect } from 'react-redux'
import { PlusOutlined } from '@ant-design/icons';
import { Radio, DatePicker, Button, Select, message, Divider, Popover } from 'antd'
import Empty from '~/components/common/empty'
import LCRelationChart from './life-cycle-relationchart'
import LCTagSpread from './life-cycle-tagspread'
import { namespace } from './store/life-cycle'
import { UNTILTYPE } from './store/constants'
import { findOrCreateTempUsergroup, createUsergroup } from '../../common/usergroup-helper'
import { UserGroupBuildInTagEnum, UserGroupFilterTypeEnum, UserGroupSetOperationEnum, UsergroupFilterStrategyEnum } from '../../../common/constants'
import { immutateUpdate } from '../../../common/sugo-utils'
import moment from 'moment'

const RadioGroup = Radio.Group
const RadioButton = Radio.Button

@connect(state => ({
  ...state.sagaCommon,
  ...state[namespace]
}))
class LCIntellAnalytics extends Component {

  state = {
    selectedTab: 'relation',
    since: moment(),
    until: moment().add(-7, 'd'),
    untilType: 'preWeek'
  }

  componentDidMount() {
    const { dataBase: { since, until, untilType } } = this.props
    this.setState({
      since,
      until,
      untilType
    })
  }

  changeProps(payload) {
    const { rotated } = this.props
    this.props.dispatch({
      type: `${namespace}/setState`,
      payload: {
        rotated: {
          ...rotated,
          ...payload
        }
      }
    })
  }

  changeTime(payload) {
    const { dataBase } = this.props
    this.props.dispatch({
      type: `${namespace}/setState`,
      payload: {
        dataBase: {
          ...dataBase,
          ...payload
        }
      }
    })
  }

  dispatch(func, payload) {
    this.props.dispatch({
      type: `${namespace}/${func}`,
      payload
    })
  }

  addRotatedHandler() {
    const { rotated } = this.props
    this.changeProps({
      rotated: immutateUpdate(rotated, 'rotatedTarget', (preTarget) => preTarget.push([])
      )
    })
  }

  async createTempUsergroup() {
    const { rotated: { rotatedTarget: ugs, nowUg, preUg }, datasourceCurrent: { id: dataSourceId, name: dataSourceName} } = this.props
    let tempURG = _.cloneDeep(ugs)
    for (let i = 0; i < ugs.length; i ++) {
      let ug = ugs[i]
      let usergroup = createUsergroup({
        userGroupTitle: 'rotated',
        dataSourceId,
        dataSourceName,
        metricalField: 'distinct_id',
        tags: [UserGroupBuildInTagEnum.Default],
        composeInstruction: [{
          op: UserGroupSetOperationEnum.intersection,
          type: UserGroupFilterTypeEnum.userGroupFilter,
          config: {
            usergroupFilterStrategy: UsergroupFilterStrategyEnum.byExistingUserGroup,
            usergroupFilterTargets: [ug[1]]
          }
        },{
          op: UserGroupSetOperationEnum.intersection,
          type: UserGroupFilterTypeEnum.userGroupFilter,
          config: {
            usergroupFilterStrategy: UsergroupFilterStrategyEnum.byExistingUserGroup,
            usergroupFilterTargets: [ug[0]]
          }
        }]
      })
      let usergroupWithTotal = await findOrCreateTempUsergroup(usergroup)
      tempURG = immutateUpdate(tempURG, `[${i}]`, (pre) => {
        return {
          start: _.get(_.find(preUg, o => o.id === ug[0]), 'title', ''),
          terminal: _.get(_.find(nowUg, o => o.id === ug[1]), 'title', ''),
          usergroupWithTotal
        }
      })
    }
    this.changeProps({
      rotatedUsergroup: tempURG
    })
  }

  renderTimeBox() {
    const { rotated: { hasData } } = this.props
    const {  since, until, untilType } = this.state
    return (
      <div className="height40">
        <div className="fleft">
          时间:
          <DatePicker
            className="width200 mg2r"
            value={since}
            format={'YYYY-MM-DD'}
            onChange={(v) => {
              let nextUntil = _.cloneDeep(v)
              if (untilType === UNTILTYPE.preDay) {
                nextUntil = nextUntil.add(-1, 'd')
              } else if (untilType === UNTILTYPE.preWeek) {
                nextUntil = nextUntil.add(-7, 'd')
              } else if (untilType === UNTILTYPE.DIY) {
                nextUntil = _.cloneDeep(until)
              }
              this.setState({
                since: v,
                until: nextUntil
              })
            }}
          />
        </div>
        <div className="fleft">
          对比:
          <RadioGroup 
            value={untilType}
            onChange={(e) => {
              let type = e.target.value
              let nextUntil = _.cloneDeep(since)
              if (type === UNTILTYPE.preDay) {
                nextUntil = nextUntil.add(-1, 'd')
              } else if (type === UNTILTYPE.preWeek) {
                nextUntil = nextUntil.add(-7, 'd')
              } else if (type === UNTILTYPE.DIY) {
                nextUntil = _.cloneDeep(until)
              }
              this.setState({
                untilType: type,
                until: nextUntil
              })
            }}
          >
            <Radio value="preDay">前一日</Radio>
            <Radio value="preWeek">上周同期</Radio>
            <Radio value="DIY">指定日期</Radio>
          </RadioGroup>
          <DatePicker
            className="width200 mg2r"
            format={'YYYY-MM-DD'}
            disabled={untilType !== 'DIY'}
            disabledDate={(current) => current && current.startOf('day') >= moment().startOf('day')}
            value={until}
            onChange={(v) => {
              this.setState({
                until: v
              })
            }}
          />
          <Button
            type="primary"
            onClick={() => {
              this.changeTime({
                since,
                until,
                untilType
              })
              this.changeProps({
                rotatedUsergroup: [],
                rotatedTarget: []
              })
              this.dispatch('fetchNowUg')
              this.dispatch('fetchPreUg')
            }}
          >确定</Button>
          <span className="mg2l" style={{display: hasData ? 'none' : 'inline-block'}}>没有数据</span>
        </div>
      </div>
    )
  }

  renderRelationBox() {
    const { rotated: { addRotatedVisible, hasData, rotatedTarget, rotatedUsergroup, nowUg, preUg }, dataBase: { since, until } } = this.props

    let addRotatedContent = (
      <div>
        {
          rotatedTarget.map( (i,idx) => (
            this.renderAddRotatedContent(idx)
          ))
        }
        <div style={{textAlign: 'center'}}><Button icon={<PlusOutlined />} type="dashed" className="width120 mg1b" onClick={() => this.addRotatedHandler()}>新增流转</Button></div>
        <div>
          <Button 
            type="primary"
            onClick={() => {
              this.createTempUsergroup()
              this.changeProps({addRotatedVisible: false})
            }}
          >确定</Button>
          <Button 
            type="primary"
            className="mg1x"
            onClick={() => {
              this.changeProps({addRotatedVisible: false})
            }}
          >取消</Button>
        </div>
      </div>
    )

    return (
      <React.Fragment>
        {this.renderTimeBox()}
        <div>
          <Popover
            title="添加流转"
            trigger="click"
            visible={addRotatedVisible}
            content={addRotatedContent}
            placement="bottom"
          >
            <Button 
              type="primary"
              onClick={() => this.changeProps({
                addRotatedVisible: !addRotatedVisible
              })}
              disabled={!hasData}
            >添加流转目标</Button>
          </Popover>
        </div>
        <div>
          <LCRelationChart 
            nowUg={nowUg}
            preUg={preUg}
            since={since.format('YYYY-MM-DD')}
            until={until.format('YYYY-MM-DD')}
            rotatedUsergroup={rotatedUsergroup}
          />
        </div>
      </React.Fragment>
    )
  }

  renderAddRotatedContent = (n) => {
    const { rotated: { rotatedTarget, nowUg, preUg } } = this.props
    
    return (
      <div key={`rotatedContent${n}`} style={{height: '60px'}}>
        <div className="fleft">
          <span>起点阶段: </span>
          <Select 
            className="width120"
            value={rotatedTarget[n][0]}
            onChange={(v) => this.changeProps({
              rotatedTarget: immutateUpdate(rotatedTarget, `[${n}][0]`, () => v)
            })}
          >
            {
              preUg.map( i => (
                <Select.Option key={i.id + 'terminal' + n} value={i.id}>{i.title}</Select.Option>
              ))
            }
          </Select>
        </div>
        <div className="fright mg2l">
          <span>终点阶段:</span>
          <Select 
            className="width120"
            value={rotatedTarget[n][1]}
            onChange={(v) => this.changeProps({
              rotatedTarget: immutateUpdate(rotatedTarget, `[${n}][1]`, () => v)
            })}
          >
            {
              nowUg.map( i => (
                <Select.Option key={i.id + 'start' + n} value={i.id}>{i.title}</Select.Option>
              ))
            }
          </Select>
        </div>
      </div>
    )
  }

  renderTagSpread() {
    const { projectCurrent } = this.props
    const tag_datasource_name = _.get(projectCurrent, 'tag_datasource_name')
    return (
      !tag_datasource_name
        ? (
          <Empty
            style={{margin: '40px 8px'}}
            description="请先关联标签项目再设置标签筛选"
          />
        )
        : (
          <LCTagSpread />
        )
    )
  }
  
  render() {
    const { selectedTab } = this.state
    return (
      <div>
        <div className="mg2b">
          <RadioGroup 
            defaultValue="relation"
            onChange={(e) => this.setState({selectedTab: e.target.value})}
          >
            <RadioButton value="relation">各阶段流转</RadioButton>
            <RadioButton value="tagDistribute">标签分布</RadioButton>
          </RadioGroup>
        </div>
        {
          selectedTab === 'relation'
            ?
            this.renderRelationBox()
            :
            this.renderTagSpread()
        }
      </div>
    )
  }
}

export default LCIntellAnalytics
