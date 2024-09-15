import React from 'react'
import { PlusOutlined, SettingOutlined } from '@ant-design/icons'
import { Tooltip, Table, Spin, message, Popconfirm, Button, Select, Menu, Dropdown, Popover } from 'antd'
import Icon from '../Common/sugo-icon'
import _ from 'lodash'
import { browserHistory } from 'react-router'
import MeasureModal, { measureTypeMap } from './measure-modal'
import { Auth, checkPermission } from '../../common/permission-control'
import AuthRender from './auth-render'
import AuthTitle from './auth-title'
import MultiAuthModal from './multi-auth-modal'
import { editMeasure, deleteMeasure, authorizeMeasure } from '../../databus/datasource'
import OrderModal from './order-modal'
import TagManage, { tagRender } from '../Common/tag-manage'
import Bread from '../Common/bread'
import setStatePromise from '../../common/set-state-promise'
import propsModDec from '../../common/props-mod'
import helpLinkMap from 'common/help-link-map'
import Search from '../Common/search'
import { Anchor } from '../Common/anchor-custom'

const { docUrl } = window.sugo
const helpLink = docUrl + helpLinkMap['/console/measure']
let canUpdate = checkPermission('/app/measure/update')

const { Option } = Select
//获取排序数据类型

@propsModDec(props => ({
  ...props,
  dimensions: (props.dimensions || []).filter(dbDim => !dbDim.params || !dbDim.params.type)
}))
@setStatePromise
export default class MeasureList extends React.Component {
  state = {
    search: '',
    modalVisible: false,
    measure: {},
    selectedRowKeys: [],
    loading: false,
    orderModalVisible: false,
    selectedTags: [],
    selectRole: 'all'
  }

  componentWillMount() {
    this.initData()
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.datasourceCurrent.id !== this.props.datasourceCurrent.id) {
      this.initData(nextProps)
    }
  }

  initData = async (nextProps = this.props) => {
    let { id } = nextProps.datasourceCurrent
    if (!id) {
      return
    }
    this.setState({
      loading: true
    })
    await this.getMeasures(id)
    await this.getOriginMeasures(id)
    await this.setStatePromise({
      loading: false
    })
  }

  getMeasures = async (id = this.props.datasourceCurrent.id) => {
    await this.props.getMeasures(id, {
      // 设置了 noauth 的话没有权限的指标也会显示出来，不能加这个参数
      // noauth: 1
    })
    await this.props.getDimensions(id, {
      // noauth: 1
    })
  }

  getOriginMeasures = async (id = this.props.datasourceCurrent.id) => {
    await this.props.getOriginMeasures(id, {
      // 设置了 noauth 的话没有权限的指标也会显示出来，不能加这个参数
      // noauth: 1,
      noSort: true
    })
  }

  onChange = e => {
    this.setState({
      selectedRowKeys: [],
      search: e.target.value
    })
  }

  edit = measure => {
    const measureTypeMapArr = Object.keys(measureTypeMap) //转换成数组

    const selectedKey = measureTypeMapArr.find(key => measureTypeMap[key].value === measure.type)

    //如果找到，就是选择的没问题，没找到，默认就是最小值的格式
    if (!selectedKey) {
      const minKey = _.minBy(measureTypeMapArr, key => measureTypeMap[key].value) //数组里最小的默认格式
      measure.type = measureTypeMap[minKey].value
    }
    this.setState({
      measure,
      modalVisible: true
    })
  }

  del = measure => {
    return async () => {
      let { id } = this.props.datasourceCurrent
      this.setState({
        loading: true
      })
      let res = await deleteMeasure([measure.name], id)
      this.setState({
        loading: false
      })
      if (res) {
        this.props.setProp({
          type: 'del_measures',
          data: measure
        })
        message.success('删除成功', 2)
      }
    }
  }

  hideModal = () => {
    this.setState({
      modalVisible: false
    })
  }

  onCreate = () => {
    let { dimensions } = this.props
    let role = _.find(this.props.roles, {
      type: 'built-in'
    })
    let currentUserRoleIds = window.sugo.user.SugoRoles.map(p => p.id)
    let role_ids = _.uniq([role.id, ...currentUserRoleIds])
    let defaultDimName = dimensions[0] ? dimensions[0].name : ''
    this.setState({
      measure: {
        name: '',
        title: '',
        formula: '',
        role_ids,
        user_ids: [],
        type: 1,
        params: {
          simple: {
            //过滤条件
            filters: [],
            //统计类型
            statistics: {
              type: 'count',
              dimensionName: defaultDimName
            },
            //or and
            relation: 'and'
          },
          composite: {
            items: [{}, {}],
            operator: 'divide'
          },
          //编辑模式
          formulaEditMode: 'simple'
        },
        pattern: 'none',
        tags: []
      },
      modalVisible: true
    })
  }

  onChangeSelect = selectedRowKeys => {
    this.setState({
      selectedRowKeys
    })
  }

  onOrder = () => {
    this.setState({
      orderModalVisible: true
    })
  }

  hideOrderModal = () => {
    this.setState({
      orderModalVisible: false
    })
  }

  updateStateTags = tags => {
    this.setState({
      tags
    })
  }

  updateFilteredTags = selectedTags => {
    this.setState({
      selectedTags
    })
  }

  updateItemTag = async (tagId, action) => {
    let { selectedRowKeys } = this.state
    let { measures, setProp } = this.props
    for (let id of selectedRowKeys) {
      let dim = _.find(measures, { id })
      if (!dim) continue
      let tags = action === 'add' ? _.uniq(dim.tags.concat(tagId)) : _.without(dim.tags, tagId)
      if (_.isEqual(tags, dim.tags)) {
        continue
      }
      let res = await editMeasure(id, { tags })
      if (!res) continue
      setProp({
        type: 'update_measures',
        data: {
          id: dim.id,
          tags
        }
      })
    }
  }

  afterDeleteTag = tagId => {
    //更新measures
    let { measures, setProp } = this.props
    let res = measures.map(dim => {
      _.remove(dim.tags, tagId)
      return dim
    })
    setProp('measures', res)

    //更新seletedtags
    let { selectedTags } = this.state
    this.setState({
      selectedTags: _.without(selectedTags, tagId)
    })
  }

  selectRoleChange = e => {
    this.setState({ selectRole: e })
  }

  renderCreateButton = () => {
    let { projectCurrent, dimensions } = this.props
    return (
      <Auth auth='app/measure/create'>
        {_.isEmpty(dimensions) ? (
          <Popconfirm
            title='此项目未导入数据源,所以无法创建指标,您希望进入数据接入页面导入数据么?'
            onConfirm={() => {
              browserHistory.push({
                pathname: `/console/project/${projectCurrent.id}`
              })
            }}
            okText='确定'
            cancelText='取消'
          >
            <Button type='primary' className='iblock' icon={<PlusOutlined />}>
              创建指标
            </Button>
          </Popconfirm>
        ) : (
          <Button type='primary' onClick={this.onCreate} className='iblock' icon={<PlusOutlined />}>
            创建指标
          </Button>
        )}
      </Auth>
    )
  }

  renderBread = () => {
    let help = (
      <div className='width300'>
        <p>指标管理可以对数据源的指标进行规范管理，例 如，创建指标、指标设置、指标授权、批量取消 授权、打标签、标签化管理等功能，还可以灵活 自定义新的数据指标。</p>
        <p>
          <Anchor href={helpLink} target='_blank' className='pointer'>
            <Icon type='export' /> 查看帮助文档
          </Anchor>
        </p>
      </div>
    )
    let extra = (
      <Popover content={help} trigger='hover' placement='bottomLeft'>
        <Anchor href={helpLink} target='_blank' className='color-grey pointer'>
          <Icon type='question-circle' />
        </Anchor>
      </Popover>
    )
    return <Bread path={[{ name: '指标管理' }]} extra={extra} />
  }

  renderContent() {
    let { measures, roles, dimensions, originMeasures, tags, datasourceCurrent: datasource, loading: propsLoading, setProp } = this.props
    let { search, modalVisible, loading, measure, selectedRowKeys, selectedTags, orderModalVisible, selectRole } = this.state

    measures = search
      ? measures.filter(m => {
          return m.title.toLowerCase().includes(search.trim().toLowerCase())
        })
      : measures
    if (selectRole !== 'all') {
      measures = measures.filter(p => _.find(p.role_ids, val => val === selectRole))
    }
    if (selectedTags.length) {
      measures = measures.filter(dim => {
        let con = dim.tags.concat(selectedTags)
        let uniq = _.uniq(con)
        return con.length !== uniq.length
      })
    }

    let tagProps = {
      projectId: datasource.id || '',
      type: 'measure',
      afterDeleteTag: this.afterDeleteTag,
      mode: selectedRowKeys.length ? 'change' : 'filter',
      filterTagIds: selectedTags,
      items: measures.filter(dim => selectedRowKeys.includes(dim.id)),
      updateFilteredTags: this.updateFilteredTags,
      updateItemTag: this.updateItemTag,
      setProp,
      tags,
      permissionUrl: 'app/measure/update'
    }

    const pagination = {
      showTotal: (total, range) => `总计 ${total} 条，当前展示第 ${range.join('~')} 条`,
      total: measures.length,
      showSizeChanger: true,
      defaultPageSize: 30
    }

    let columns = [
      {
        title: '名称',
        dataIndex: 'title',
        key: 'title',
        sorter: (a, b) => (a.title > b.title ? 1 : -1),
        render: (text, rec) => {
          if (canUpdate) {
            return text ? (
              <Tooltip placement='topLeft' title={text}>
                <div className='pointer bold mw300 elli' onClick={() => this.edit(rec)}>
                  {text}
                </div>
              </Tooltip>
            ) : null
          }
          return text ? (
            <Tooltip placement='topLeft' title={text}>
              <div className='mw300 elli'>{text}</div>
            </Tooltip>
          ) : null
        }
      },
      {
        title: '公式',
        dataIndex: 'formula',
        key: 'formula',
        sorter: (a, b) => (a.formula > b.formula ? 1 : -1)
      },
      {
        title: <AuthTitle title='指标' />,
        key: 'auth',
        render: (text, record) => {
          return <AuthRender record={record} roles={roles} />
        }
      },
      {
        title: '分组',
        dataIndex: 'tags',
        key: 'tags',
        render: tagRender(tags)
      },
      {
        title: <div className='aligncenter'>操作</div>,
        key: 'op',
        render: (text, ug) => {
          return (
            <div className='aligncenter'>
              <Auth auth='app/measure/update'>
                <Tooltip title='编辑'>
                  <Icon type='sugo-edit' className='color-grey font14 pointer hover-color-main' onClick={() => this.edit(ug)} />
                </Tooltip>
              </Auth>
              <Auth auth='app/measure/delete'>
                <Popconfirm title={`确定删除指标 "${ug.name}" 么？`} placement='topLeft' onConfirm={this.del(ug)}>
                  <Tooltip title='删除'>
                    <Icon type='sugo-trash' className='mg2l font14 color-grey hover-color-red pointer' />
                  </Tooltip>
                </Popconfirm>
              </Auth>
            </div>
          )
        }
      }
    ]

    const rowSelection = {
      selectedRowKeys,
      onChange: this.onChangeSelect
    }

    let authMenu = (
      <Menu
        onClick={e => {
          if (e.key === 'add') {
            this.authModal.auth()
          } else if (e.key === 'cancel') {
            this.authModal.deAuth()
          } else if (e.key === 'addAll') {
            this.authModal.authAll()
          } else if (e.key === 'cancelAll') {
            this.authModal.deAuthAll()
          }
        }}
      >
        <Menu.Item key='add' disabled={!selectedRowKeys.length}>
          批量授权所选指标
        </Menu.Item>
        <Menu.Item key='cancel' disabled={!selectedRowKeys.length}>
          批量取消授权所选指标
        </Menu.Item>
        <Menu.Item key='addAll'>全部授权</Menu.Item>
        <Menu.Item key='cancelAll'>全部取消授权</Menu.Item>
      </Menu>
    )

    return (
      <Spin spinning={propsLoading || loading}>
        {modalVisible ? (
          <MeasureModal
            hideModal={this.hideModal}
            modalVisible={modalVisible}
            datasource={datasource}
            setProp={this.props.setProp}
            measure={measure}
            measures={measures}
            dimensions={dimensions}
            roles={roles}
            tags={tags}
          />
        ) : null}
        {orderModalVisible ? (
          <OrderModal
            modalVisible={orderModalVisible}
            datasource={datasource}
            data={originMeasures}
            hideModal={this.hideOrderModal}
            type='measure'
            submitCallback={this.getMeasures}
          />
        ) : null}
        <MultiAuthModal
          ref={ref => (this.authModal = ref)}
          data={this.props.measures}
          keys={selectedRowKeys}
          updater={authorizeMeasure}
          roles={roles}
          setProp={setProp}
          type='measure'
          datasource={datasource}
        />
        <div className='datasources-lists pd2y pd3x'>
          <div className='pd2b'>
            <div className='fix'>
              <div className='fleft'>
                <Select value={selectRole} dropdownMatchSelectWidth={false} onChange={this.selectRoleChange} className='width150 iblock'>
                  <Option value='all' key='all'>
                    全部角色
                  </Option>
                  {roles.map(groups => {
                    let { id, name } = groups
                    return (
                      <Option value={id} key={id}>
                        {name}
                      </Option>
                    )
                  })}
                </Select>
                <Auth auth='post:/app/measure/order-management'>
                  <Button type='ghost' icon={<SettingOutlined />} onClick={this.onOrder} className='iblock mg2l'>
                    排序和隐藏
                  </Button>
                </Auth>
                <div className='width200 iblock mg2l'>
                  <Search onChange={this.onChange} value={search} placeholder='搜索' className='iblock' />
                </div>
              </div>
              <div className='fright'>
                {this.renderCreateButton()}
                <Auth auth='app/measure/authorize'>
                  <Dropdown overlay={authMenu} trigger={['click']}>
                    <Button type='ghost' className='iblock mg1l'>
                      授权
                      <Icon type='down' />
                    </Button>
                  </Dropdown>
                </Auth>
                <Auth auth='post:/app/measure/tags-management'>
                  <TagManage {...tagProps} className='iblock mg1l' />
                </Auth>
              </div>
            </div>
          </div>
          <Table columns={columns} rowKey={rec => rec.id} pagination={pagination} rowSelection={rowSelection} dataSource={measures} bordered onChange={this.handleChange} />
        </div>
      </Spin>
    )
  }

  render() {
    return (
      <div className='height-100 bg-white'>
        {this.renderBread()}
        <div className='scroll-content' style={{ height: 'calc(100% - 44px)' }}>
          {this.renderContent()}
        </div>
      </div>
    )
  }
}
