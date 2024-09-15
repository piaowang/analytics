import React, {Component} from 'react'
import { CloseCircleOutlined, SaveOutlined } from '@ant-design/icons';
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Button, Input, message, Popover, Select, Tabs } from 'antd';
import icUser from '../../images/ic_user.svg'
import icEdit from '../../images/edit.svg'
import icDisableUser from '../../images/disable_user.svg'
import icDisableEdit from '../../images/disableEdit.svg'
import _ from 'lodash'
import AsyncTaskRunner from '../Common/async-task-runner'
import {findOrCreateTempUsergroup, sliceToUsergroup} from '../../common/usergroup-helper'
import moment from 'moment'
import {convertDateType, isRelative} from '../../../common/param-transform'
import {addUsergroup} from '../../actions'
import {connect} from 'react-redux'
import {bindActionCreators} from 'redux'

const TabPane = Tabs.TabPane

const getPopupContainer = () => document.querySelector('.appuser-lifecycle-box')

const mapStateToProps = () => ({})
const mapDispatchToProps = dispatch => bindActionCreators({ addUsergroup }, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
export default class LifeCycleBox extends Component {

  constructor(props) {
    super(props)
    this.state = {
      visiblePopoverKey: '',
      popupSavePanelValue: {},
      userGroup: null,
      ugWithTotal: null,
      selectedPanelTime: null,
      selectedPanelProduct: null,
      userDefinedSubmitLoading: false
    }
  }
  
  componentDidCatch(error, info) {
    console.log(error, info)
  }
  
  componentDidMount() {
    this.getUserGroup()
  }

  getUserGroup = async () => {
    let { sl } = this.props
    const timeRangeOpts = _.get(sl, 'timeRange')
    if (timeRangeOpts && sl.changeTimeRange) {
      sl = sl.changeTimeRange(sl, timeRangeOpts[0].value, timeRangeOpts[0].title)
    }
    let metricalField = _.get(sl, 'params.dimensions[0]')
    this.setState({
      userGroup: await sliceToUsergroup(sl, metricalField)
    })
  }

  renderPopupSavePanel = () => {
    return (
      <div className="width300">
        <Tabs defaultActiveKey="saveAs" onChange={null}>
          <TabPane
            tab="另存为"
            key="saveAs"
          >
            {this.renderPopupSavePanelForm('save-as')}
          </TabPane>
        </Tabs>
      </div>
    )
  }

  renderPopupSavePanelForm = () => {
    let { popupSavePanelValue } = this.state
    return (
      <div>
        <div className="pd1b">
          <span className="block mg1b">用户群名称:</span>
          <Input
            className="block width-100"
            value={_.get(popupSavePanelValue, 'title')}
            onChange={ev => {
              let { value } = ev.target
              this.setState({
                popupSavePanelValue: { ...popupSavePanelValue, title: value }
              })
            }}
          />
        </div>
        <div className="pd1b">
          <span className="block mg1b">用户群备注:</span>
          <Input
            className="block width-100"
            value={_.get(popupSavePanelValue, 'description')}
            onChange={ev => {
              let { value } = ev.target
              this.setState({
                popupSavePanelValue: { ...popupSavePanelValue, description: value }
              })
            }}
          />
        </div>
        <Button
          type="primary"
          icon={<SaveOutlined />}
          className="width-100 mg2t"
          onClick={this.handlePopSaveUserSubmit}
        >保存</Button>
      </div>
    );
  }

  renderPopupUserDefinedPanel = () => {
    let { sl } = this.props
    let { userDefinedSubmitLoading } = this.state
    let timeRange = sl && sl.timeRange
    let productRange = sl && sl.productRange
    return (
      <div>
        <div className="pd1b grey" id="popupUserDefinedPanelTime">
          <span className="block mg1b">时间:</span>
          {
            timeRange ?
              <Select
                style={{ width: '300px' }}
                defaultValue={{ key: timeRange[0].value, label: timeRange[0].title }}
                labelInValue
                onChange={(v) => this.handleSelecterChange(v, 'selectedPanelTime')}
              >
                {
                  timeRange.map(time => (
                    <Select.Option value={time.value} key={time.value}>{time.title}</Select.Option>
                  ))
                }
              </Select>
              :
              null
          }
        </div>
        {
          productRange ?
            <div className="pd1b" id="popupUserDefinedPanelProduct">
              <span className="block mg1b">可选产品:</span>
              <Select
                style={{ width: '300px' }}
                onChange={(v) => this.handleSelecterChange(v, 'selectedPanelProduct')}
                defaultValue={{ key: productRange[0].value, label: productRange[0].title }}
                labelInValue
              >
                {productRange.map( pro =>(
                  <Select.Option value={pro.value} key={pro.value}>{pro.title}</Select.Option>
                ))}
              </Select>
            </div>
            :
            null
        }
        <Button
          type="primary"
          icon={<LegacyIcon type={userDefinedSubmitLoading ? 'loading' : 'save'} />}
          className="width-100 mg2t"
          onClick={this.handlePopupUserDefinedSubmit}
        >执行</Button>
      </div>
    );
  }

  handleSelecterChange = (value, type) => {
    this.setState({
      [type]: value
    })
  }
  
  handlePopupUserDefinedSubmit = async () => {
    const { selectedPanelTime, selectedPanelProduct } = this.state
    let { sl } = this.props
    this.setState({ userDefinedSubmitLoading: true })
    if (!sl.productRange) {
      //只有时间选择框
      if (!selectedPanelTime) {
        //如果没改变条件不执行查询 如果后续需求变为不允许阻塞则把窗口关了
        message.error('请改变条件后执行')
        return this.setState({ userDefinedSubmitLoading: false })
      }
      sl = sl.changeTimeRange(sl, selectedPanelTime.key, selectedPanelTime.label)
      let metricalField = _.get(sl, 'params.dimensions[0]')
      this.setState({
        userGroup: await sliceToUsergroup(sl, metricalField)
      })
      this.setState({ userDefinedSubmitLoading: false })
      this.handleHidePop()
    } else if (selectedPanelTime || selectedPanelProduct) {
      //有时间选择框和产品选择框时 有一个条件变了就执行查询
      const timeRangeOpts = _.get(sl, 'timeRange')
      sl = selectedPanelTime
        ? sl.changeTimeRange(sl, selectedPanelTime.key, selectedPanelTime.label)
        : sl.changeTimeRange(sl, timeRangeOpts[0].value, timeRangeOpts[0].title)
      sl = selectedPanelProduct
        ? sl.changeProductRange(sl, selectedPanelProduct.key, selectedPanelProduct.label)
        : sl
      let metricalField = _.get(sl, 'params.dimensions[0]')
      this.setState({
        userGroup: await sliceToUsergroup(sl, metricalField)
      })
      this.setState({ userDefinedSubmitLoading: false })
      return this.handleHidePop()
    } else {
      //如果都没变则阻塞 否则关窗
      message.error('请改变条件后执行')
      return this.setState({ userDefinedSubmitLoading: false })
    }
    
  }

  handlePopSaveUserSubmit = () => {
    let { popupSavePanelValue: nextUg } = this.state
    this.props.addUsergroup(nextUg, res => {
      if (res) {
        const dom = (
          <span>
            添加分群成功
            <a href={`/console/usergroup/${res.result.id}/users`} className="pointer mg1l">查看用户群用户</a>
          </span>
        )
        message.success(dom, 15)
      }
    })

    this.handleHidePop()
  }

  handleHidePop = () => {
    this.setState({ visiblePopoverKey: '' })
  }

  render() {
    let { sl } = this.props
    const { visiblePopoverKey, ugWithTotal, userGroup } = this.state
    
    const userDefinedPanelTitle = (
      <div>
        <span>自定义规则</span>
        <CloseCircleOutlined
          key="close"
          className="fright fpointer font18 color-grey"
          onClick={() => {
            this.setState({ visiblePopoverKey: '' })
          }} />
      </div>
    )
    if (_.isEmpty(userGroup)) {
      return null
    }
    if (sl.disable) {
      return (
        <div className="appuser-lifecycle-box width280 bg-gray-blue" style={{ position: 'relative' }}>
          <div className="lifecycle-box-main width-60">
            <div className="appuser-lifecycle-header mg2t">
              <img src={icDisableUser} alt="" className="height40 width40" />
            </div>
            <div className="appuser-lifetcycle-comment mg2t font12" style={{ color: '#ccc' }}>
              {userGroup.title}
            </div>
            <div className="totalPeople font24 color-purple mg1t">
              <b style={{ color: '#ccc' }}>0人</b>
            </div>
            <div className="mg1t">
              <a className="color-purple-blue" style={{ color: '#ccc' }}>保存生成用户群</a>
            </div>
          </div>
          <div className="mg1y mg2x fright">
            <a className="height-10 appuser-lifecycle-edit" style={{ color: '#ccc' }}>
              自定义规则
              <img src={icDisableEdit} className="height25" />
            </a>
          </div>
        </div>
      )
    }
    return (
      <div className="appuser-lifecycle-box width280 bg-gray-blue" style={{ position: 'relative' }}>
        <div className="lifecycle-box-main width-60">
          <div className="appuser-lifecycle-header mg2t">
            <img src={icUser} alt="" className="height40 width40" />
          </div>
          <div className="appuser-lifetcycle-comment mg2t font12">
            {userGroup.title}
          </div>
          <div className="totalPeople font24 color-purple mg1t">
            <AsyncTaskRunner
              args={[userGroup]}
              task={async (ug) => {
                return await findOrCreateTempUsergroup(ug)
              }}
              onResult={ugWithTotal => {
                this.setState({ ugWithTotal })
              }}
            >
              {({ result: ugWithUserCount }) => {
                let userCount = _.get(ugWithUserCount, 'params.total') || 0
                return <b>{userCount}人</b>
              }}
            </AsyncTaskRunner>
          </div>
          <div className="mg1t">
            <Popover
              placement="rightTop"
              content={this.renderPopupSavePanel()}
              trigger="click"
              visible={visiblePopoverKey === 'savePanel'}
              getPopupContainer={getPopupContainer}
              onVisibleChange={(visible) => {
                this.setState({
                  visiblePopoverKey: visible ? 'savePanel' : '',
                  popupSavePanelValue: visible ? ugWithTotal : {}
                })
              }}
            >
              <a className="color-purple-blue">保存生成用户群</a>
            </Popover>
          </div>
        </div>
        <div className="mg1y mg2x fright">
          <Popover
            placement="rightTop"
            title={userDefinedPanelTitle}
            content={this.renderPopupUserDefinedPanel()}
            getPopupContainer={getPopupContainer}
            trigger="click"
            visible={visiblePopoverKey === 'userDefinedPanel'}
          >
            <a className="height-10 appuser-lifecycle-edit" onClick={() => this.setState({ visiblePopoverKey: 'userDefinedPanel' })}>
              自定义规则
              <img src={icEdit} className="height25" />
            </a>
          </Popover>
        </div>
      </div>
    )
  }
}
