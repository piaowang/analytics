/* eslint-disable react/prop-types */
import React, { Component } from 'react'
import _ from 'lodash'
import * as d3 from 'd3'
import classNames from 'classnames'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Col, Row, Menu, message, Dropdown, Popconfirm, Radio, Card } from 'antd';
import { UserGroupFilterTypeEnum, UserGroupFilterTypeTranslation,
  UserGroupSetOperationEnum, UserGroupSetOperationTranslation,
  AccessDataType, UsergroupFilterStrategyEnum, UsergroupFilterStrategyTranslation
} from 'common/constants'
import { immutateUpdate, immutateUpdates, interpose } from 'common/sugo-utils'
import iconDownBlue from '../../images/icon-down-blue.png'
import UserGroupSelector from '../Common/usergroup-selector'
import TagFilterEditor from '../Usergroup/tag-filter-editor'
import BehaviorFilterEditor from '../Usergroup/behavior-filter-editor'
import { bool, formItemLayout1 } from '../Usergroup/constants'
import UsergroupUpload from '../Usergroup/usergroup-upload'
import './css.styl'
import { tagFiltersAdaptToOldFormat } from 'common/param-transform'
import { defaultParams } from '../Usergroup/usergroup-form'

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 3 }
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 21 }
  }
}

const format02d = d3.format('02d')

const getPopupContainer = () => document.querySelector('.life-cycle-form-card .ant-card-body')

export default class UserGroupEditor extends Component {

  constructor(props) {
    super(props)
    this.state = {
      dimensionTree: {},
      hasUpload: false,
      maxLength: 6, // 允许添加最多筛选组限制
      editingUserGroupFilterType: '', // 空代暂无选中类型
      visiblePopoverKey: ''
    }
  }

  dispatch(func, payload) {
    this.props.dispatch({type: `lifeCycleForm/${func}`}, payload)
  }

  changeProps(payload) {
    this.props.dispatch({type: 'lifeCycleForm/setState', payload })
  }

  onChangeUploadResult = uploadResult => {
    const { expandIdx, stageState } = this.props
    const { editingUserGroupFilterType: eUGF } = this.state
    let editingUserGroupFilterType = eUGF.split('-')[0]
    
    this.changeProps({
      stageState: stageState.map( (i, idx) => {
        if (idx === +expandIdx) {
          let composeIdx = _.findIndex(i.params.composeInstruction, o => o.type === editingUserGroupFilterType)
          i.params.composeInstruction[composeIdx].config.uploadResult = uploadResult
        }
        return i
      })
    })
    this.setState({
      hasUpload: true
    })
  }

  renderAppendFilterTypeBtn = () => {
    let { stageState, expandIdx, groupby } = this.props
    let { maxLength } = this.state
    let usergroup = _.cloneDeep(stageState[expandIdx])
    let composeInstruction = _.get(usergroup, 'params.composeInstruction') || []
    if (composeInstruction.length === maxLength) { // 用户群的创建规则组合，限制6个
      return null
    }

    const menu = (
      <Menu
        onClick={({ key }) => {
          let preAppend = {}
          let defaultParams0 = defaultParams()
          if (key.includes('behaviorFilter')) {
            preAppend = {
              type: key,
              op: UserGroupSetOperationEnum.union,
              config:  _.pick(defaultParams0, ['relativeTime', 'since', 'until', 'measure', 'measure3', 'dimension', 'tagFilters', 'usergroupFilterTargets', 'usergroupFilterStrategy'])
            }
          } else if (key.includes('userTagFilter')) {
            preAppend = {
              type: key,
              op: UserGroupSetOperationEnum.union,
              config:  _.pick(defaultParams0, ['tagFilters'])
            }
          } else if (key.includes('userGroupFilter')) {
            preAppend = {
              type: key,
              op: UserGroupSetOperationEnum.union,
              config:  {
                ..._.pick(defaultParams0, ['usergroupFilterTargets', 'usergroupFilterStrategy']),
                uploadResult: []
              }
            }
          }
          //点击创建规则后 生成视图用
          usergroup = immutateUpdate(usergroup, 'params.composeInstruction', arr => {
            return [...(arr || []), preAppend]
          })

          this.changeProps({
            stageState: immutateUpdate(stageState, `[${expandIdx}]`, () => usergroup)
          })
          this.setState(prevState => {
            return {
              editingUserGroupFilterType: key + '-' + composeInstruction.length
            }
          })
        }}
      >
        {_.keys(UserGroupFilterTypeEnum).map(filterType => {
          return (
            <Menu.Item
              filter-type={UserGroupFilterTypeEnum[filterType]}
              key={`${UserGroupFilterTypeEnum[filterType]}`}
            >
              {UserGroupFilterTypeTranslation[filterType]}
            </Menu.Item>
          )
        })}
      </Menu>
    )
    return (
      <Dropdown overlay={menu} trigger={['click']}>
        <Button
          icon={<PlusOutlined />}
          className="width150"
          type="primary"
          style={{marginTop: '20px'}}
        >添加创建规则</Button>
      </Dropdown>
    );
  }

  renderFilterSwitcherPanel = () => {
    const { editingUserGroupFilterType } = this.state
    let { stageState, expandIdx } = this.props
    let usergroup = _.cloneDeep(stageState[expandIdx])
    let composeInstruction = _.get(usergroup, 'params.composeInstruction') || []
    return (
      <div style={{padding: '0 10px'}}>
        <div style={{padding: '10px 3% 0px'}} className="usergroup-filter-type-switcher">
          {interpose((dom, idx) => {
            let composeInst = composeInstruction[idx + 1]
            if (!composeInst) {
              return null
            }
            return (
              <div key={idx} className="aligncenter" style={{padding: '10px 0 5px'}}>
                <Radio.Group
                  className="block"
                  value={composeInst.op}
                  onChange={ev => {
                    let nextOp = ev.target.value
                    usergroup = immutateUpdate(usergroup, `params.composeInstruction[${idx + 1}].op`, () => nextOp)
                    this.changeProps({stageState: immutateUpdate(stageState, `[${expandIdx}]`, () => usergroup)})
                  }}
                >
                  {_.keys(UserGroupSetOperationEnum).map(op => {
                    return (
                      <Radio.Button
                        key={op}
                        value={UserGroupSetOperationEnum[op]}
                        className="font14"
                      >{UserGroupSetOperationTranslation[op]}</Radio.Button>
                    )
                  })}
                </Radio.Group>

                <img
                  src={iconDownBlue}
                  style={{marginTop: '5px'}}
                />
              </div>
            )
          }, composeInstruction.map((composeInst, idx) => {
            const { type: key, op } = composeInst
            const filterType = key
            const selected = (key + '-' + idx) === editingUserGroupFilterType
            return (
              <div
                key={key + idx}
                className={classNames('border corner relative filter-type-item fpointer', {'active': selected})}
                style={{width: '100%', height: 48, lineHeight: '48px', padding: '0 0 0 5px'}}
                onClick={() => {
                  this.setState({editingUserGroupFilterType: key + '-' + idx})
                }}
              >
                <div
                  className={classNames('iblock corner font16 line-height24 color-white', {
                    'bg-purple': selected,
                    'bg-be': !selected
                  })}
                  style={{height: 24, padding: '0 4px'}}
                >{format02d(idx + 1)}</div>

                <div className="center-of-relative font16 elli">{`${UserGroupFilterTypeTranslation[filterType]}`}</div>

                <MinusCircleOutlined
                  className={classNames('font16 absolute vertical-center-of-relative', {'color-main': selected, 'color-bf': !selected})}
                  style={{right: '20px'}}
                  onClick={ev => {
                    ev.stopPropagation()
                    usergroup = immutateUpdate(usergroup, 'params.composeInstruction', arr => {
                      return arr.filter((v, i) => i !== idx)
                    })
                    this.changeProps({stageState: immutateUpdate(stageState, `[${expandIdx}]`, () => usergroup)})
                    this.setState({
                      editingUserGroupFilterType: selected ? '' : editingUserGroupFilterType
                    })
                  }} />
              </div>
            );
          }))}

          <div className="aligncenter">
            {this.renderAppendFilterTypeBtn()}
          </div>
        </div>
      </div>
    );
  }

  renderRightPart = () => {
    const { editingUserGroupFilterType: eUGF } = this.state
    const filterType = eUGF.split('-')[0]
    return (
      <Card
        className="height-100 life-cycle-form-card"
        bordered={false}
      >
        {filterType === UserGroupFilterTypeEnum.behaviorFilter
          ? this.renderBehaviorFilterForm()
          : filterType === UserGroupFilterTypeEnum.userTagFilter
            ? this.renderUserTagFilterForm()
            : filterType === UserGroupFilterTypeEnum.userGroupFilter
              ? this.renderUserGroupFilterForm()
              : null}
      </Card>
    )
  }

  renderBehaviorFilterForm = () => {
    //expandIdx 当前抽屉在编辑第几个阶段的usergroup
    let {projectCurrent, projectList, stageState, expandIdx, relatedBehaviorProjectId} = this.props
    const { editingUserGroupFilterType: eUGF } = this.state
    let editingUserGroupFilterType = eUGF.split('-')[0]
    let composeIdx = eUGF.split('-')[1]
    let usergroup = _.cloneDeep(stageState[expandIdx])
    if (projectCurrent.access_type === AccessDataType.Tag && !relatedBehaviorProjectId) {
      return (
        <div className="pd3 aligncenter color-gray font16">
          请先关联行为项目再设置行为筛选
        </div>
      )
    }
    let behaviorProject = projectCurrent.access_type !== AccessDataType.Tag
      ? projectCurrent
      : _.find(projectList, {id: relatedBehaviorProjectId})

    //usergroup传入前需要组装成旧结构
    //todo config composeIdx都要改
    let config = _.get(usergroup,`params.composeInstruction[${composeIdx}].config`, {})//该config在store中初始化过 如果复用可以在此处初始化
    usergroup.params = {
      ...usergroup.params,
      ...config
    }
    
    return (
      <div className="ug-form">
        <Form className="clear">
          <BehaviorFilterEditor
            behaviorProject={behaviorProject}
            usergroup={usergroup}
            formItemLayout={formItemLayout}
            onUsergroupChange={nextUg => {
              let nextConfig = _.pick(nextUg.params, ['dimension', 'measure', 'measure3','relativeTime','since','until'])
              this.changeProps({stageState: immutateUpdate(stageState, `[${expandIdx}].params.composeInstruction[${composeIdx}].config`, () => nextConfig)})
            }}
            getPopupContainer={getPopupContainer}
          />
        </Form>
      </div>
    )
  }

  renderUserTagFilterForm = () => {
    let {projectCurrent, projectList, relatedUserTagProjectId, stageState, expandIdx} = this.props
    const { editingUserGroupFilterType: eUGF } = this.state
    let editingUserGroupFilterType = eUGF.split('-')[0]
    let usergroup = _.cloneDeep(stageState[expandIdx])
    if (projectCurrent.access_type !== AccessDataType.Tag && !relatedUserTagProjectId) {
      return (
        <div className="pd3 aligncenter color-gray font16">
          请先关联标签项目再设置标签筛选
        </div>
      )
    }
    let tagProject = projectCurrent.access_type === AccessDataType.Tag
      ? projectCurrent
      : _.find(projectList, {id: relatedUserTagProjectId})

    //usergroup传入前需要组装成旧结构
    let config = _.get(_.find(usergroup.params.composeInstruction, o => o.type === editingUserGroupFilterType),'config', {}) //该config在store中初始化过 如果复用可以在此处初始化
    let composeIdx = _.findIndex(usergroup.params.composeInstruction, o => o.type === editingUserGroupFilterType)
    usergroup.params = {
      ...usergroup.params,
      ...config
    }
    
    return (
      <div className="ug-form">
        <Form>
          <Form.Item
            {...formItemLayout}
            label="标签筛选条件"
          >
            <TagFilterEditor
              tagProject={tagProject}
              usergroup={usergroup}
              onUsergroupChange={nextUg => {
                let nextConfig = _.pick(nextUg.params, ['tagFilters'])
                this.changeProps({stageState: immutateUpdate(stageState, `[${expandIdx}].params.composeInstruction[${composeIdx}].config`, () => nextConfig)})
              }}
            />
          </Form.Item>
        </Form>
      </div>
    )
  }

  renderUserGroupFilterForm = () => {
    let {datasourceCurrent, projectList, stageState, expandIdx} = this.props
    const { editingUserGroupFilterType: eUGF, hasUpload } = this.state
    let editingUserGroupFilterType = eUGF.split('-')[0]
    let usergroup = _.cloneDeep(stageState[expandIdx])

    //usergroup传入前需要组装成旧结构
    let config = _.get(_.find(usergroup.params.composeInstruction, o => o.type === editingUserGroupFilterType),'config', {}) //该config在store中初始化过 如果复用可以在此处初始化
    let composeIdx = _.findIndex(usergroup.params.composeInstruction, o => o.type === editingUserGroupFilterType)
    usergroup.params = {
      ...usergroup.params,
      ...config
    }
    let uploadResult = config.uploadResult

    let {usergroupFilterTargets, usergroupFilterStrategy} = _.get(usergroup, 'params')
    return (
      <div className="ug-form">
        <Form className="clear">
          <Form.Item {...formItemLayout} label="用户群来源">
            <Radio.Group
              onChange={ev => {
                let nextUsergroupFilterStrategy = ev.target.value
                let nextConfig = immutateUpdates(config,'usergroupFilterStrategy', () => nextUsergroupFilterStrategy)
                this.changeProps({stageState: immutateUpdate(stageState, `[${expandIdx}].params.composeInstruction[${composeIdx}].config`, () => nextConfig)})
              }}
              value={usergroupFilterStrategy || UsergroupFilterStrategyEnum.byExistingUserGroup}
            >
              {_.keys(UsergroupFilterStrategyEnum).map(k => {
                return (
                  <Radio.Button value={k} key={k}>{UsergroupFilterStrategyTranslation[k]}</Radio.Button>
                )
              })}
            </Radio.Group>
          </Form.Item>

          {usergroupFilterStrategy === UsergroupFilterStrategyEnum.byUpload
            ? (
              <UsergroupUpload
                usergroup={usergroup}
                formItemLayout={formItemLayout1}
                onChangeUploadResult={this.onChangeUploadResult}
                uploadResult={uploadResult}
                uploadedUserGroup={config.uploadedUserGroup}
                hasUpload={hasUpload}
              />
            )
            : (
              <Form.Item {...formItemLayout} label="目标用户群">
                <UserGroupSelector
                  className="width300"
                  datasourceCurrent={datasourceCurrent}
                  projectList={projectList}
                  userGroupFilter={dbUg => dbUg.id !== usergroup.id}
                  showBuildInUserGroups={false}
                  value={_.isEmpty(usergroupFilterTargets) ? '' : usergroupFilterTargets[0]}
                  onChange={targetUg => {
                    let nextConfig = immutateUpdates(config,
                      'usergroupFilterTargets', () => [targetUg.id].filter(_.identity),
                      'usergroupFilterStrategy', () => UsergroupFilterStrategyEnum.byExistingUserGroup
                    )

                    this.changeProps({stageState: immutateUpdate(stageState, `[${expandIdx}].params.composeInstruction[${composeIdx}].config`, () => nextConfig)})
                  }}
                />
              </Form.Item>
            )}

        </Form>
      </div>
    )
  }

  render() {
    const { expandIdx } = this.props
    return (
      <div className="life-cycle-user-group-editor">
        <div className="split-line" />
        <Row gutter={24}>
          <Col span={7}>
            {this.renderFilterSwitcherPanel()}
          </Col>
          <Col span={17}>
            {this.renderRightPart()}
          </Col>
        </Row>
        <div className="footer-btn">
          <Button onClick={() => this.props.onClose(expandIdx)} className="mg2r">关闭</Button>
        </div>
      </div>
    )
  }
}
