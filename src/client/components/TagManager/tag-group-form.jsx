/**
 * 标签组合
 */

import React from 'react'
import { enableSelectSearch } from '../../common/antd-freq-use-props'
import { DruidColumnTypeIcon } from 'common/druid-column-type'
import Icon from '../Common/sugo-icon'
import { validateFieldsAndScroll } from '../../common/decorators'
import TagOptionFetcher from '../Fetcher/tag-options-fetcher.js'
import TypeList, { typesBuilder, untypedTitle } from './tag-type-list'
import { browserHistory } from 'react-router'
import { CheckCircleOutlined, CloseOutlined, TeamOutlined } from '@ant-design/icons'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Button, Input, Popconfirm, Radio, Select, Tooltip, TreeSelect } from 'antd'
import _ from 'lodash'
import { getDiff } from './common'
import classNames from 'classnames'
import * as d3 from 'd3'
import { computeTagResult } from '../../actions'
import { tagGroupParamsToSliceFilters } from './url-functions'
import { checkPermission } from '../../common/permission-control'
import { EMPTY_TAG_TITLE } from '../../constants/string-constant'
import { immutateUpdate, interpose } from '../../../common/sugo-utils'
import AsyncHref from '../Common/async-href'
import { bindActionCreators } from 'redux'
import * as roleActions from '../../actions/roles'
import { connect } from 'react-redux'
import AuthSelect from '../Datasource/auth-select'
import { isSuperUser } from '../../common/user-utils'
import { Anchor } from '../Common/anchor-custom'

const canDeleteTagGroup = checkPermission('post:/app/tag-group/delete')
const canUpdateTagGroup = checkPermission('put:/app/tag-group/update')
const canUpdateUseStatus = checkPermission('put:/app/tag-group/update-status')
const canAuthorizeTagGroup = checkPermission('put:/app/tag-group/authorize/:id')

const RadioButton = Radio.Button
const RadioGroup = Radio.Group
let percentFormat = d3.format('.2%')
const { Option } = Select
const FormItem = Form.Item
const formItemLayout = {
  labelCol: { span: 3 },
  wrapperCol: { span: 18 }
}
const propsCheck = ['dimensions', 'tagTypes', 'datasourceCurrent']
const pickProps = item => {
  return _.pick(item, ['percent', 'title', 'value'])
}
const TreeNode = TreeSelect.TreeNode
let mapStateToProps = state => _.pick(state.common, 'roles')
let mapDispatchToProps = dispatch => bindActionCreators(roleActions, dispatch)

@connect(mapStateToProps, mapDispatchToProps)
@Form.create()
@validateFieldsAndScroll
export default class TagGroupForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      types: [],
      computeResult: null,
      queryUserUrl: '',
      tagDimDic: {},
      computing: false
    }
  }

  componentWillMount() {
    this.props.getRoles()
    this.buildTypes()
  }

  componentDidMount() {
    let filters = _.get(this.props, 'tagGroup.params.filters') || []
    if (!filters.length) {
      this.addFilter()
    }
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.tagGroup, this.props.tagGroup)) {
      this.props.form.resetFields()
      this.resetResult()
    }
    if (!_.isEqual(_.pick(this.props, propsCheck), _.pick(nextProps, propsCheck))) {
      this.buildTypes(nextProps)
    }
  }

  resetResult = () => {
    this.setState({
      computeResult: null,
      queryUserUrl: ''
    })
  }

  compute = async () => {
    this.setState({ computing: true })
    const { projectCurrent, dimensions } = this.props
    let params = this.getParams()
    let { relation = 'and' } = params
    params = this.removeEmpty(params)

    let filters = [{ col: this.props.form.getFieldValue('title'), op: relation, eq: tagGroupParamsToSliceFilters(params) }]
    let res = await computeTagResult(projectCurrent, filters, relation, dimensions)
    let queryUserUrl = this.props.buildUrl(filters, 'and')
    this.setState({
      computing: false,
      computeResult: res,
      queryUserUrl
    })
  }

  optionFilter = (input, option) => {
    return option.props.title.includes(input)
  }

  checkFilters = (props = this.props) => {
    let filters = _.get(props, 'tagGroup.params.filters') || []
    if (!filters.length) {
      this.addFilter()
    }
  }

  callback = type => {
    this.props.form.setFieldsValue({
      type
    })
  }

  openMoal = () => {
    this.typeList.onNewTag(this.callback)
  }

  buildTypes = async (props = this.props) => {
    let { types = [] } = await typesBuilder(props)

    let tagTypeIdDict = _.keyBy(props.tagTrees, 'id')
    let typeNameDimIdDict = _(props.tagTypes)
      .keyBy('dimension_id')
      .mapValues(mapping => _.get(tagTypeIdDict[mapping.tag_tree_id], 'name'))
      .value()
    this.setState({
      tagDimDic: typeNameDimIdDict,
      types
    })
  }

  updateParams = params => {
    this.props.form.setFieldsValue({
      params: JSON.stringify(params)
    })
  }

  getParams = () => {
    const params = this.props.form.getFieldValue('params')
    let { dimensions } = this.props
    if (!dimensions.length) {
      return { filters: [], relation: 'and' }
    }
    let dimNameDict = _.keyBy(dimensions, 'name')
    const json = _.isString(params) ? JSON.parse(params) : params || { filters: [], relation: 'and' }
    _.forEach(json.filters, p => {
      if ('dimension' in p) {
        p.dimension.type = _.get(dimNameDict, [p.dimension.name, 'type'], '')
      } else if ('filters' in p) {
        _.forEach(p.filters, p0 => {
          p0.dimension.type = _.get(dimNameDict, [p0.dimension.name, 'type'], '')
        })
      }
    })

    if (!json.relation) {
      json.relation = 'and'
    }
    return json
  }

  validateParamsBool = () => {
    let params = this.getParams()
    let { filters } = params
    return _.some(filters, flt => {
      if ('dimension' in flt) {
        return flt.dimension.id && flt.children.length
      } else if ('filters' in flt) {
        return _.some(flt.filters, flt0 => flt0.dimension.id && flt0.children.length)
      }
      return false
    })
  }

  del = async () => {
    let { tagGroups, isTagManager = false } = this.props
    let { id } = this.props.tagGroup
    let rest = tagGroups.filter(t => t.id !== id)
    let rest0 = rest[0] || { id: '' }
    let res = await this.props.delTagGroup(id)
    if (res && !isTagManager) {
      browserHistory.replace(`/console/tag-group?id=${rest0.id}`)
    }
  }

  validateParams = (rule, value, callback) => {
    let res = this.validateParamsBool()
    callback(res ? undefined : '请选择标签条件')
  }

  removeEmpty = params => {
    params.filters = params.filters
      .map(f => {
        if ('dimension' in f) {
          return _.omit(f, 'typeTitle')
        } else if ('filters' in f) {
          return {
            ...f,
            filters: _.filter(f.filters, f0 => f0.dimension.id && f0.children.length)
          }
        }
        return f
      })
      .filter(f => {
        if ('dimension' in f) {
          return f.dimension.id && f.children.length
        } else if ('filters' in f) {
          return _.some(f.filters, f0 => f0.dimension.id && f0.children.length)
        }
        return f
      })
    return params
  }

  onSubmit = async e => {
    const { isTagManager = false } = this.props
    e.preventDefault()
    let res = await this.validateFieldsAndScroll()
    if (!res) return
    let tagGroupOld = _.get(this.props, 'tagGroup')
    let params = this.getParams()
    params = this.removeEmpty(params)
    let n = {
      ...res,
      params
    }
    n.datasource_id = n.datasource_id || this.props.datasourceCurrent.id
    if (n.type === untypedTitle) {
      n.type = ''
    }
    if (!tagGroupOld.id) {
      n.status = 0
      let res = await this.props.addTagGroup(n)
      if (res && !isTagManager) {
        browserHistory.push(`/console/tag-group?id=${res.result.id}`)
      }
    } else {
      let diff = getDiff(tagGroupOld, n)
      this.props.updateTagGroup(tagGroupOld.id, { ...diff, title: n.title })
    }
  }

  changeUseStatus = async () => {
    let tagGroupOld = _.get(this.props, 'tagGroup')
    let tagGroups = _.get(this.props, 'tagGroups')
    let tagStatus = tagGroups.find(p => p.id === tagGroupOld.id) || {}
    this.props.updateTagGroup(tagGroupOld.id, {
      status: tagStatus.status === 1 ? 0 : 1,
      type: tagStatus.type,
      title: tagGroupOld.title // 修改时显示名称，方便日志搜索
    })
  }

  addFilter = () => {
    let params = this.getParams()
    params.filters.push({
      dimension: {},
      children: []
    })
    this.updateParams(params)
  }

  onChangeRelation = e => {
    let params = this.getParams()
    params.relation = e.target.value
    this.updateParams(params)
  }

  renderControl() {
    let { tagGroup, tagGroups } = this.props
    if (!tagGroup || !tagGroup.id) return null
    let { params } = tagGroup || {}
    let tagStatus = (tagGroups.find(p => p.id === tagGroup.id) || {}).status
    return (
      <FormItem className='aligncenter' wrapperCol={{ span: 18, offset: 3 }}>
        {canUpdateUseStatus ? (
          <Popconfirm
            placement='top'
            title={[
              <div key='0'>{`确定${tagStatus === 0 ? '启用' : '停用'}该标签吗?`}</div>,
              <div style={{ color: '#dd585d' }} className='mg1y' key='1'>
                注意:{`${tagStatus === 0 ? '启用' : '停用'}`}后将会在标签体系中{`${tagStatus === 0 ? '显示' : '隐藏'}`}
              </div>
            ]}
            onConfirm={this.changeUseStatus}
          >
            <Button type={tagStatus === 0 ? 'success' : 'danger'} icon={<CheckCircleOutlined />} size='default'>
              {tagStatus === 0 ? '启用' : '停用'}
            </Button>
          </Popconfirm>
        ) : null}
        {canUpdateTagGroup && (tagStatus === 0 || canUpdateUseStatus) ? (
          <Button type='ghost' icon={<CheckCircleOutlined />} size='default' className='mg1l' onClick={this.onSubmit}>
            更新
          </Button>
        ) : null}
        {!canDeleteTagGroup ? null : (
          <Popconfirm title='确定删除么' onConfirm={this.del}>
            <Button type='ghost' icon={<CloseOutlined />} className='mg1l' size='default'>
              删除
            </Button>
          </Popconfirm>
        )}
        <AsyncHref
          initFunc={() => {
            let filters = [{ col: this.props.form.getFieldValue('title'), op: params.relation || 'and', eq: tagGroupParamsToSliceFilters(params) }]
            let url = this.props.buildUrl(filters, 'and')
            return url
          }}
          target='_blank'
        >
          <Button type='ghost' icon={<TeamOutlined />} className='mg1l' size='default'>
            查看用户列表
          </Button>
        </AsyncHref>
      </FormItem>
    )
  }

  renderDelFilter = (condParams, idx, i, filter) => {
    return (
      <Tooltip title='移除'>
        <Icon
          type='close-circle-o'
          className='iblock mg1l pointer'
          onClick={() => {
            if (_.get(condParams, ['filters', idx, 'filters']).length === 1) {
              this.updateParams(immutateUpdate(condParams, 'filters', flts => flts.filter((flt, i) => i !== idx)))
            } else {
              this.updateParams(
                immutateUpdate(condParams, ['filters', idx, 'filters'], arr => {
                  return arr.filter((o, i0) => i0 !== i)
                })
              )
            }
          }}
        />
      </Tooltip>
    )
  }

  renderTagSelect = (condParams, idx, i, filter) => {
    let { dimension, children } = filter
    let { datasourceCurrent, projectCurrent } = this.props
    let props = {
      datasourceCurrent,
      projectCurrent,
      dimension
    }
    let value = children.map(t => JSON.stringify(_.omit(pickProps(t), 'percent')))
    return (
      <TagOptionFetcher {...props}>
        {({ data, isFetching }) => {
          let arr = data || []
          let cls = `iblock width200 ${isFetching ? 'is-fetching' : ''}`
          return (
            <Select
              {...enableSelectSearch}
              value={value}
              className={cls}
              placeholder='请选择'
              dropdownMatchSelectWidth={false}
              onChange={value => {
                let children = value.map(v => JSON.parse(v))
                this.updateParams(immutateUpdate(condParams, ['filters', idx, 'filters', i, 'children'], () => children))
              }}
              mode='tags'
            >
              {arr.map((op, i) => {
                let { title, percent } = op
                let txt = title === EMPTY_TAG_TITLE ? title : `${title}(${percent}%)`
                return (
                  <Option value={JSON.stringify(_.omit(pickProps(op), 'percent'))} key={i + 'optg' + title} title={txt}>
                    {txt}
                  </Option>
                )
              })}
            </Select>
          )
        }}
      </TagOptionFetcher>
    )
  }

  renderTreeSelectNode = data => {
    if (data.children) {
      return (
        <TreeNode selectable={false} value={data.treeId} title={data.type} key={`node-${data.treeId}`}>
          {data.children
            .filter(p => p.nodeType !== 'tagGroup' && p.from !== 'tagGroup')
            .map(p => {
              return this.renderTreeSelectNode(p)
            })}
        </TreeNode>
      )
    } else {
      return <TreeNode value={data.id} title={data.title || data.name} key={`node-${data.id}`} />
    }
  }

  renderFilter = (condParams, idx, i, filter) => {
    let { dimensions, datasourceCurrent, tagTypes, tagTrees } = this.props
    if (!dimensions.length) return null
    let commonMetric = _.get(datasourceCurrent, 'params.commonMetric') || []
    dimensions = dimensions.filter(p => {
      let { name } = p
      return p.is_druid_dimension && name !== '__time' && !p.from && !commonMetric.includes(name)
    })
    let { tagDimDic = {}, types = [] } = this.state

    const hasOtherVal = false //_.includes(pretty, OTHERS_TAG_TITLE)
    let filterOptions = _.startsWith(_.get(filter, 'dimension.name'), 'm')
      ? [
          <Option value='also in' disabled={hasOtherVal}>
            同时包含
          </Option>,
          <Option value='equal' disabled={hasOtherVal}>
            有且仅有
          </Option>
        ]
      : []

    // 按标签类别筛选
    let typeTitle = _.get(filter, 'typeTitle') || ''
    if (typeTitle) {
      dimensions = dimensions.filter(d => {
        let { id } = d
        let tp = tagDimDic[id] || untypedTitle
        return tp === typeTitle
      })
    }
    return (
      <div className='tag-group-filter pd1b' key={i + 'tgf'}>
        <TreeSelect
          showSearch
          className='iblock width200 mg1r'
          style={{ width: 300 }}
          value={_.get(filter, 'dimension.id')}
          dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
          placeholder='选择标签'
          allowClear
          treeDefaultExpandAll
          onChange={value => {
            let dimension = _.find(this.props.dimensions, d => d.id === value)
            this.updateParams(
              immutateUpdate(condParams, ['filters', idx, 'filters', i], () => {
                return {
                  dimension: _.pick(dimension, ['id', 'title', 'name']),
                  children: []
                }
              })
            )
          }}
        >
          {types.map(p => {
            return this.renderTreeSelectNode(p)
          })}
        </TreeSelect>

        <Select
          className='iblock width100 mg1r'
          value={_.get(filter, 'action', 'in')}
          placeholder='请选择'
          onChange={value => {
            this.updateParams(
              immutateUpdate(condParams, ['filters', idx, 'filters', i], prev => {
                return {
                  ...prev,
                  action: value
                }
              })
            )
          }}
        >
          <Option value='in'>包含</Option>
          {filterOptions}
          <Option value='not in'>排除</Option>
        </Select>

        {this.renderTagSelect(condParams, idx, i, filter)}
        {this.renderDelFilter(condParams, idx, i, filter)}
      </div>
    )
  }

  renderSubFilterGroup = (filter, idx, condParams) => {
    let finalFilter = filter
    if ('children' in filter) {
      // 保持数据结构为最新的形式
      finalFilter = { relation: 'and', filters: [filter] }
      condParams = immutateUpdate(condParams, ['filters', idx], () => finalFilter)
    }

    let { relation, filters } = finalFilter
    return (
      <div className='mg1b pd1y pd2l' style={{ border: '1px dashed #aaa' }} key={idx}>
        <span
          className='pointer mg3r iblock'
          onClick={() => {
            this.updateParams(
              immutateUpdate(condParams, ['filters', idx], () => {
                return {
                  ...finalFilter,
                  filters: [...finalFilter.filters, { dimension: {}, children: [] }]
                }
              })
            )
          }}
        >
          <Icon type='plus-circle-o' className='mg1r' />
          添加标签条件
        </span>
        {_.get(condParams, ['filters', idx, 'filters'], []).length <= 1 ? null : (
          <RadioGroup
            value={relation}
            size='small'
            onChange={ev => {
              let { value: nextRelation } = ev.target
              this.updateParams(
                immutateUpdate(condParams, ['filters', idx], () => {
                  return {
                    ...finalFilter,
                    relation: nextRelation
                  }
                })
              )
            }}
          >
            <Radio value='and'>并且</Radio>
            <Radio value='or'>或者</Radio>
          </RadioGroup>
        )}

        {filters.map((flt, i) => this.renderFilter(condParams, idx, i, flt))}
      </div>
    )
  }

  renderParams(condParams) {
    /*let demoParams = {
      relation: 'or',
      'filters': [
        {
          relation: 'and',
          filters: [
            {
              'children': [{'title': 'male', 'value': ['male'], 'percent': '26.18'}],
              'dimension': {'id': 'SJulxp14ZM', 'name': 'profile_gender', 'title': '性别'}
            }
          ]
        },
        {
          'children': [{'title': 'male', 'value': ['male'], 'percent': '26.18'}],
          'dimension': {'id': 'SJulxp14ZM', 'name': 'profile_gender', 'title': '性别'}
        }
      ]
    }*/
    let { relation = 'and', filters = [] } = condParams

    return (
      <div className='tag-group-filters'>
        <div className='pd1b'>
          <div className='pd1y iblock mg2r font14'>
            <span className='pointer' onClick={this.addFilter}>
              <Icon type='plus-circle-o' className='mg1r' />
              添加标签组合
            </span>
          </div>
          {_.get(condParams, ['filters'], []).length <= 1 ? null : (
            <RadioGroup value={relation} onChange={this.onChangeRelation}>
              <RadioButton value='and'>并且</RadioButton>
              <RadioButton value='or'>或者</RadioButton>
            </RadioGroup>
          )}
          {_.get(condParams, ['filters'], []).length <= 1 ? null : (
            <span className='mg1l'>
              筛选关系
              <Tooltip
                title={
                  <div>
                    <b>并且</b>表示必须同时满足当前所有筛选条件
                    <br />
                    <b>或者</b>表示满足当前任意一个筛选条件
                  </div>
                }
              >
                <Icon type='question-circle-o' className='mg1l' />
              </Tooltip>
            </span>
          )}
        </div>
        {interpose(
          (d, idx) => (
            <div className='color-green' key={`sep${idx}`}>
              {relation === 'or' ? '或者' : '并且'}
            </div>
          ),
          filters.map((flt, idx) => this.renderSubFilterGroup(flt, idx, condParams))
        )}
      </div>
    )
  }

  renderUserLink = (computeResult, queryUserUrl, count) => {
    if (!computeResult || !queryUserUrl) {
      return null
    }
    return (
      <span className='mg2l'>
        共
        <Tooltip title='查看用户详情'>
          {0 < count ? (
            <Anchor className='under-line pointer mg1x' href={queryUserUrl} target='_blank'>
              {count}
            </Anchor>
          ) : (
            <span className='mg1x'>{count}</span>
          )}
        </Tooltip>
        人{_.isNumber(computeResult.totalCount) ? `，占总人数 ${percentFormat(computeResult.totalCount === 0 ? 0 : count / computeResult.totalCount)}` : null}
        <Anchor href={queryUserUrl} target='_blank' className={classNames('mg2l pointer', { hide: !count })}>
          <Icon type='team' /> 查看用户详情
        </Anchor>
      </span>
    )
  }

  renderCompute() {
    let { computeResult, queryUserUrl } = this.state
    let count = _.get(computeResult, 'count')
    if (!canUpdateUseStatus) return null
    return (
      <FormItem wrapperCol={{ span: 12, offset: 3 }}>
        <Button type='primary' onClick={this.compute} loading={this.state.computing} disabled={!this.validateParamsBool()}>
          计算人数
        </Button>
        {this.renderUserLink(computeResult, queryUserUrl, count)}
      </FormItem>
    )
  }

  renderFormBtn() {
    let id = _.get(this.props, 'tagGroup.id')
    return id ? null : (
      <FormItem wrapperCol={{ span: 12, offset: 3 }}>
        <hr />
        <Button type='success' htmlType='submit'>
          保存
        </Button>
      </FormItem>
    )
  }

  renderType = (item, i) => {
    let { type } = item
    let v = type === untypedTitle ? '' : type
    return (
      <Option value={v} key={type + 'ti' + i}>
        {type}
      </Option>
    )
  }

  rebuildData = types => {
    return types.map(t => {
      let res = {
        label: t.type,
        value: t.treeId,
        key: t.treeId
      }
      let childrenTypes = (t.children || []).filter(d => !d.typeTitle)
      if (childrenTypes.length) {
        res.children = this.rebuildData(childrenTypes)
      }
      return res
    })
  }

  render() {
    const {
      form: { getFieldDecorator },
      tagGroup = {},
      showCreateTagType = true,
      datasourceCurrent,
      roles
    } = this.props
    const { title, description, params, type } = tagGroup
    let { types } = this.state
    let condParams = this.getParams()
    let treeData = this.rebuildData(types)
    let treeSelectProps = {
      showSearch: true,
      placeholder: '请选择标签分类',
      treeData,
      treeNodeFilterProp: 'name',
      allowClear: true,
      treeDefaultExpandAll: true,
      onChange: this.callback
    }
    getFieldDecorator('role_ids', { initialValue: _.isEmpty(tagGroup.role_ids) ? [] : tagGroup.role_ids })

    return (
      <div className={`tag-group-form-wrap ${showCreateTagType ? 'pd3y' : ''}`}>
        <Form onSubmit={this.onSubmit}>
          {this.renderControl()}
          <FormItem {...formItemLayout} label='名称'>
            {getFieldDecorator('title', {
              rules: [
                {
                  required: true,
                  message: '请输入名称'
                },
                {
                  min: 1,
                  max: 20,
                  type: 'string',
                  message: '1~20个字符'
                }
              ],
              initialValue: title
            })(<Input />)}
          </FormItem>
          <FormItem {...formItemLayout} label='分类'>
            <div className='iblock width200'>
              {getFieldDecorator('type', {
                initialValue: type
              })(<TreeSelect {...treeSelectProps} />)}
            </div>
          </FormItem>
          <FormItem {...formItemLayout} label='标签含义'>
            {getFieldDecorator('description', {
              rules: [
                {
                  required: true,
                  message: '请填写标签含义'
                },
                {
                  min: 1,
                  max: 20,
                  type: 'string',
                  message: '1~20个字符'
                }
              ],
              initialValue: description
            })(<Input />)}
          </FormItem>
          <FormItem {...formItemLayout} label='标签组合'>
            <div>
              {getFieldDecorator('params', {
                rules: [
                  {
                    validator: this.validateParams
                  }
                ],
                initialValue: JSON.stringify(params)
              })(<Input className='hide' />)}
              {this.renderParams(condParams)}
            </div>
          </FormItem>

          {canAuthorizeTagGroup || isSuperUser() ? (
            <FormItem {...formItemLayout} label='授权访问'>
              <AuthSelect
                dataSourceRoles={datasourceCurrent.role_ids || []}
                roles={roles}
                record={this.props.form.getFieldsValue(['role_ids'])}
                onClick={role => {
                  let role_ids = this.props.form.getFieldValue('role_ids') || []
                  let { id } = role
                  let nextRoleIds = role_ids.includes(id) ? role_ids.filter(rid => rid !== id) : [...role_ids, id]

                  this.props.form.setFieldsValue({ role_ids: nextRoleIds.filter(_.identity) })
                }}
              />
            </FormItem>
          ) : null}

          {this.renderCompute()}
          {this.renderFormBtn()}
        </Form>
        <div className='hide'>
          <TypeList {...this.props} types={types} ref={ref => (this.typeList = ref)} />
        </div>
      </div>
    )
  }
}
