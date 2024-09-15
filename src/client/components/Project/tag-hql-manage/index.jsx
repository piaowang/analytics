import React from 'react'
import { PlusOutlined } from '@ant-design/icons';
import { Input, Button, Tag, Tooltip, Spin, Badge, Popconfirm, notification, Popover, Select, Table } from 'antd'
import Store from './store'
import _ from 'lodash'
import CreateHQL from './new'
import DataImport from './data-import'
import moment from 'moment'
import { getNextTriggerDate } from 'client/common/cron-picker-kit'
import './css.styl'
import { Auth } from 'client/common/permission-control'
import tagRequirementChecker from '../../TagManager/tag-require'

import { getCurrentTagProject } from '../../../common/tag-current-project'
const getNextCronDate = (exp) => {
  const interval = getNextTriggerDate(exp)
  return moment(interval.next().toString()).format('YYYY-MM-DD HH:mm:ss')
}

const WEIGHT_TEXT = ['普通', '中等', '优先']
const WEIGHT_COLOR = ['', '#2db7f5', '#108ee9']

/**
 * @description 标签计算管理
 * @export
 * @class TagHQLList
 * @extends {React.Component}
 */
export default class TagHQLList extends React.Component {

  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    this.store.subscribe(state => this.setState(state))
    this.state = this.store.getState()
  }

  componentDidMount() {
    this.init(this.props)
  }

  componentWillReceiveProps(nextProps) {
    if (!_.isEqual(nextProps.projectCurrent, this.props.projectCurrent)) {
      this.init(nextProps)
    }
  }

  /**
   * 入口组件，有两种方式进入
   * 1. 输入路由直接进入，此时需要从 componentWillReceiveProps 中取值
   * 2. 通过页面Link跳转，此时可以在 componentWillMount 中父级传入取值
   * @param project
    */
  init(props) {
    if (props.projectCurrent.id) {
      const { tagProject } = getCurrentTagProject(props.projectList, props.projectCurrent)
      this.store.initViewListModel(tagProject)
    }
  }

  onSave = (data, projectId) => {
    const { save } = this.store
    data.project_id = projectId
    save(data)
  }

  onDataImport = (data) => {
    this.store.dataImport(data)
  }

  onPaginationChange = (page, pageSize) => {
    this.store.paging(page, pageSize)
  }

  onManualRun = async obj => {
    const res = await this.store.manualRun(obj)
    if (res.success) {
      notification.success({
        message: '操作成功',
        description: `手动执行【${obj.title}】成功`
      })
    }
  }

  onRefresh = () => {
    const { vm: { search, selectedStatus } } = this.state
    this.store.queryList(search, selectedStatus)
  }

  handleStatus = (status) => {
    const { vm: { search } } = this.state
    this.store.queryList(search, status)
  }

  renderTable = () => {
    const { vm } = this.state
    const { hqlList, dimensionList, loading, total, pageSize } = vm
    if (!hqlList.length) {
      return (<div className="color-999 pd3 aligncenter">暂无内容</div>)
    }
    const columns = [{
      title: '标题/HQL',
      dataIndex: 'title',
      sorter: (a, b) => a.title > b.title ? 1 : -1,
      render: (title, record) => {
        const weight = record.weight
        return (
          <div className="mg1">
            <h4 className="elli pd1b mg0 bold">
              {title}
              <Tooltip title="任务执行优先级">
                <Tag className="mg2l" color={WEIGHT_COLOR[weight]}>{WEIGHT_TEXT[weight]}</Tag>
              </Tooltip>
            </h4>
            {record.hql}
          </div>
        )
      }
    }, {
      title: '关联标签',
      dataIndex: 'tags',
      width: 250,
      render: tags => {
        return <span className="width80">{dimensionList.filter(dim => (tags || []).includes(dim.id)).map(dim => dim.title || dim.name).join('，')}</span>
      }
    }, {
      title: '最近调度时间',
      dataIndex: 'recent_run_at',
      width: 140,
      sorter: (a, b) => a.recent_run_at > b.recent_run_at ? 1 : -1,
      render: recent_run_at => recent_run_at ? moment(recent_run_at).format('YYYY-MM-DD HH:mm:ss') : '--'
    }, {
      title: '下次调度时间',
      dataIndex: 'rules',
      width: 140,
      render: (rules, record) => {
        const { cronExpression } = rules
        const status = record.status === 1
        return status ?
          <Popover
            content={`下次调度时间：${getNextCronDate(cronExpression)}`}
          >
            {getNextCronDate(cronExpression)}
          </Popover> : '--'
      }
    }, {
      title: '状态',
      dataIndex: 'status',
      width: 70,
      sorter: (a, b) => a.status > b.status ? 1 : -1,
      render: (val, obj) => {
        const status = val === 1
        const isManual = vm[`running-${obj.id}`]
        if (isManual) {
          return <Badge status="processing" text="执行中" />
        }
        return status ?
          <Badge status="processing" text="已启用" />
          :
          <Badge status="default" text="未启用" />
      }
    }, {
      title: '操作',
      key: 'op',
      className: 'aligncenter',
      width: 160,
      render: (val, obj) => {
        const { cronExpression } = obj.rules
        const status = obj.status === 1
        return (
          <div>
            <Auth auth="app/tag-hql/manual-run">
              {
                !vm[`running-${obj.id}`] ? (
                  <Popconfirm title="确认手动执行该任务吗？" onConfirm={() => this.onManualRun(obj)}>
                    <a className="mg1r pointer">手动执行</a>
                  </Popconfirm>
                )
                  : (
                    vm[`cancel-${obj.id}`] ? <a className="mg1r">取消中...</a> :
                      <a className="mg1r pointer" onClick={() => this.store.cancelManualRun(obj)}>取消执行</a>
                  )
              }
            </Auth>
            <Auth auth="app/tag-hql/run">
              <Popconfirm
                title={(
                  <div>
                    <p>{status ? '停用' : '启用'}【{obj.title}】</p>
                    {status ? <p className="color-red">注意：停用任务后，将不在执行定时调度任务</p> : null}
                    {!status ? (<div>
                      <p className="color-red">启用任务后，将定时执行调度任务</p>
                      <p className="color-red">下次调度时间：{getNextCronDate(cronExpression)}</p>
                    </div>) : null}
                  </div>
                )}
                onConfirm={() => this.store.run(obj, status ? 'stop' : 'start')}
              >
                <a className="mg1r pointer">{status ? '停用' : '启用'}</a>
              </Popconfirm>
            </Auth>
            {
              status ?
                <a className="mg1r pointer" onClick={() => this.store.initEditModel(obj.id)}>查看</a>
                :
                <Auth auth="app/tag-hql/update">
                  <a className="mg1r pointer" onClick={() => this.store.initEditModel(obj.id)}>编辑</a>
                </Auth>
            }
            <Auth auth="app/tag-hql/remove">
              <Popconfirm title="确认删除该记录吗？" onConfirm={() => this.store.remove(obj.id)}>
                <a className="mg1r pointer">删除</a>
              </Popconfirm>
            </Auth>
            {/*<Button className="mg1r" onClick={() => alert('暂未实现')}>修改历史</Button>*/}
          </div>
        )
      }
    }]
    return (
      <Table
        loading={loading}
        rowKey="id"
        bordered={false}
        columns={columns}
        dataSource={hqlList}
        size="middle"
        pagination={{
          total,
          pageSize,
          showTotal: total => `总记录数 ${total}`,
          onChange: this.onPaginationChange
        }}
      />
    )
  }

  render() {
    let { projectCurrent, datasourceCurrent, datasourceList, projectList } = this.props
    const { vm } = this.state
    const { tagHQL, modalVisible, dataImportVisible, dimensionList, loading, saveing, selectedStatus } = vm
    const { hideModalVisible } = this.store
    const tagDimenions = dimensionList.filter(d => d.name !== '__time')
    // 判断项目类型 使用关联tag项目的数据源
    const { tagProject, tagDatasource } = getCurrentTagProject(projectList, projectCurrent, datasourceList, datasourceCurrent)
    // 如果存在子项目，优先取子项目parent_id
    const projectId = tagProject.parent_id || tagProject.id
    const datasoureceId = tagDatasource.id

    let hintPage = tagRequirementChecker({projectCurrent: tagProject, datasourceCurrent:tagDatasource, moduleName: '标签任务管理'})
    if (hintPage) {
      return hintPage
    }
    return (
      <div className="tag-hql-manage scroll-content always-display-scrollbar">
        <div className="pd2b">
          <div className="itblock width200 mg1l">
            <Input
              placeholder="标签任务标题或关联标签名称"
              onChange={e => this.store.search(e.target.value)}
            />
          </div>
          <div className="itblock mg2l">
            <span className="mg1r">运行状态：</span>
            <Select
              defaultValue={selectedStatus}
              className="width100"
              onChange={this.handleStatus}
            >
              <Select.Option key="s-all" value={'-1'}>--全部--</Select.Option>
              <Select.Option key="s-start" value={'1'}>已启用</Select.Option>
              <Select.Option key="s-stop" value={'0'}>已停用</Select.Option>
            </Select>
            <Button className="mg2l" onClick={this.onRefresh}>刷新</Button>
          </div>
          <div className="fright">
            <Auth auth="app/tag-hql/create">
              <Button
                type="primary"
                className="width100"
                icon={<PlusOutlined />}
                onClick={() => this.store.initEditModel()}
              >创建</Button>
            </Auth>
            {/*<Button className="mg2r">执行队列</Button>*/}
            {
              !sugo.enableTagUploadHistory
                ? <Auth auth="app/tag-hql/data-import">
                  <Button className="mg1l" onClick={() => this.store.dataImport()}>标签数据导入</Button>
                </Auth>
                : null
            }
          </div>
        </div>

        <div className="">
          <Spin spinning={loading}>
            {this.renderTable()}
          </Spin>
          {
            !modalVisible ? null :
              (
                <CreateHQL
                  saveing={saveing}
                  data={tagHQL}
                  tagDimenions={tagDimenions}
                  hideModal={hideModalVisible}
                  visible={modalVisible}
                  save={(data) => this.onSave(data, tagProject.id)}
                />
              )
          }
          <Auth auth="app/tag-hql/data-import">
            {
              !dataImportVisible ? null :
                <DataImport
                  saveing={saveing}
                  hideModal={hideModalVisible}
                  tagDimenions={tagDimenions}
                  visible={dataImportVisible}
                  datasourceId={datasoureceId}
                  projectId={projectId}
                  save={this.store.saveDataImport}
                />
            }
          </Auth>
        </div>
      </div>
    );
  }
}
