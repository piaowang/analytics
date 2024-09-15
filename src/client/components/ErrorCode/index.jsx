/**
 * @author coinxu<duanxian0605@gmail.com>
 * @date 2017/12/21
 * @description
 */

import './base.styl'
import './style.styl'
import React from 'react'
import { InboxOutlined, SearchOutlined } from '@ant-design/icons';
import {
  Button,
  Col,
  Input,
  message,
  Modal,
  Row,
  Select,
  Table,
  Tabs,
  Upload,
  Popconfirm,
  Spin,
  Popover,
} from 'antd';
import Store from './store'
import { checkPermission } from '~/src/client/common/permission-control.js'
import classNames from 'classnames'
import _ from 'lodash'
import Bread from 'client/components/Common/bread'
import DimensionBindingBtn from './dimension-binding-btn'

const Option = Select.Option
const TabPane = Tabs.TabPane

const canEditErrorCode = checkPermission('put:/app/monitor-alarms/error-code/:id')
const canEditProductLine = checkPermission('put:/app/monitor-alarms/error-code/productLine/:id')
const canEditSystemCode = checkPermission('put:/app/monitor-alarms/error-code/system-code/:id')
const canEditInterfaceCode = checkPermission('put:/app/monitor-alarms/error-code/interface-code/:id')
// const canEditErrorCode = true
// const canEditProductLine = true

export default class Main extends React.Component {
  static ROW_SPAN_DEF = {
    LEFT: 18,
    RIGHT: 6
  }

  static COL_LAYOUT = {
    LABEL: 4,
    WRAPPER: 20
  }

  /**
   * @param {Array<object>} list
   * @param {String} key
   * @return {Map}
   */
  static modelMapCreator(list, key) {
    const map = new Map()
    for (let m of list) {
      map.set(m[key], m)
    }
    return map
  }

  constructor(props, context) {
    super(props, context)
    this.store = new Store()
    /** @type {LogCodeLogCodeViewState} */
    this.state = this.store.getState()
    this.store.subscribe(state => this.setState(state))
  }

  componentWillMount() {
    this.store.init(this.props.projectCurrent)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.projectCurrent.id && this.props.projectCurrent.id !== nextProps.projectCurrent.id) {
      this.store.init(nextProps.projectCurrent)
    }
  }

  componentDidUpdate() {
    if (this.state.vm.tips) {
      message.info(this.state.vm.tips, 3)
    }
  }

  renderFilterAndBtns() {
    let {projectCurrent} = this.props
    const { systems, modules, interfaces, filter } = this.state.vm
    return (
      <div>
        <strong className="gap-pd-small-right">系统:</strong>
        <Select
          allowClear
          value={filter.system_id || null}
          onChange={system_id => this.store.setVMFilter({ system_id, module_id: null })}
          className="display-inline-block width-small"
        >
          {systems.map(r => (<Option key={r.id} value={r.id}>{r.name}</Option>))}
        </Select>
        <strong className="gap-pd-base-left gap-pd-small-right">产品线:</strong>
        <Select
          allowClear
          value={filter.module_id || null}
          onChange={module_id => this.store.setVMFilter({ module_id, interface_id: null })}
          className="display-inline-block width-small"
        >
          {
            modules
              .filter(r => filter.system_id ? r.system_id === filter.system_id : true)
              .map(r => (<Option key={r.id} value={r.id}>{r.code}</Option>))
          }
        </Select>
        <strong className="gap-pd-base-left gap-pd-small-right">接口方:</strong>
        <Select
          allowClear
          value={filter.interface_id || null}
          onChange={interface_id => this.store.setVMFilter({ interface_id })}
          className="display-inline-block width-small"
        >
          {
            interfaces
              .filter(r => {
                if (filter.module_id && r.module_id !== filter.module_id) {
                  return false
                }
                if (filter.system_id && r.system_id !== filter.system_id) {
                  return false
                }
                return true
              })
              .map(r => (<Option key={r.id} value={r.id}>{r.name}</Option>))
          }
        </Select>
        <div className="display-inline-block gap-pd-small-right gap-pd-base-left">
          <Input
            type="text"
            className="width-base"
            placeholder="搜索错误码"
            onChange={e => this.store.setVMFilter({ keyword: e.target.value })}
          />
          <Button
            icon={<SearchOutlined />}
            onClick={() => this.store.search()}
            className="gap-mg-small-left"
          >搜索</Button>
          <Button
            onClick={() => this.store.openLogCodeModal(true)}
            className={classNames('gap-mg-large-left', { hide: !canEditErrorCode })}
          >新建</Button>
        </div>
        <Button
          className={classNames('gap-mg-base-x', { hide: !canEditSystemCode })}
          onClick={() => this.store.openSystemModal(true)}
        >系统管理</Button>
        <Button
          className={classNames('gap-mg-base-right', { hide: !canEditProductLine })}
          onClick={() => this.store.openModuleModal(true)}
        >产品线管理</Button>
        <Button
          onClick={() => this.store.openInterfaceModal(true)}
          className={classNames({ hide: !canEditInterfaceCode })}
        >接口方管理</Button>

        <DimensionBindingBtn projectCurrent={projectCurrent} />
      </div>
    );
  }

  renderTables() {
    const vm = this.state.vm
    // TODO move to vm
    const SystemMaps = Main.modelMapCreator(vm.systems, 'id')
    const ModuleMaps = Main.modelMapCreator(vm.modules, 'id')
    const InterfaceMaps = Main.modelMapCreator(vm.interfaces, 'id')
    const LogCodeMap = Main.modelMapCreator(vm.codes, 'id')

    const dataSources = vm.codes.map(r => ({
      id: r.id,
      system_code: SystemMaps.get(r.system_id) ? SystemMaps.get(r.system_id).code : '-',
      system_name: SystemMaps.get(r.system_id) ? SystemMaps.get(r.system_id).name : '-',
      module_code: ModuleMaps.get(r.module_id) ? ModuleMaps.get(r.module_id).code : '-',
      interface_code: r.interface_id && InterfaceMaps.get(r.interface_id) ? InterfaceMaps.get(r.interface_id).code : '-',
      interface_name: r.interface_id && InterfaceMaps.get(r.interface_id) ? InterfaceMaps.get(r.interface_id).name : '-',
      code: r.code,
      name: r.name
    }))

    const columns = [
      {
        title: '系统代码',
        dataIndex: 'system_code',
        key: 'system_code'
      },
      {
        title: '系统',
        dataIndex: 'system_name',
        key: 'system_name'
      },
      {
        title: '产品线',
        dataIndex: 'module_code',
        key: 'module_code'
      },
      {
        title: '接口方代码',
        dataIndex: 'interface_code',
        key: 'interface_code'
      },
      {
        title: '接口方',
        dataIndex: 'interface_name',
        key: 'interface_name'
      },
      {
        title: '错误码',
        dataIndex: 'code',
        key: 'code'
      },
      {
        title: '错误码描述',
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'id',
        render: id => {
          return (
            <div className="gap-pd-base">
              <i
                onClick={() => this.store.openLogCodeEditor(true, LogCodeMap.get(id))}
                className={classNames('sugoicon sugo-edit color-grey font14 pointer hover-color-main gap-mg-base-right', { hide: !canEditErrorCode })}
              />
              <Popconfirm title="确认删除" onConfirm={() => this.store.destroyLogCode(LogCodeMap.get(id))}>
                <i
                  className={classNames('sugoicon sugo-trash mg2l font14 color-grey pointer hover-color-red', { hide: !canEditErrorCode })}
                />
              </Popconfirm>
            </div>
          )
        }
      }
    ]

    return (
      <Table
        bordered
        size="small"
        rowKey="id"
        dataSource={dataSources}
        columns={columns}
        pagination={{
          current: vm.pagination.currentPage,
          pageSize: vm.pagination.pageSize,
          total: vm.pagination.count,
          onChange: (page, pageSize) => this.store.onPageChange(page, pageSize)
        }}
      />
    )
  }

  renderSystemModal() {
    const { vm, SystemCode } = this.state
    const storage = vm.storage
    const Message = _.isObject(SystemCode.message) ? SystemCode.message : {}
    const disabled = !!(SystemCode.code === null || SystemCode.name === null || Message.code || Message.name)
    const columns = [
      {
        title: '系统名称',
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: '系统代码',
        dataIndex: 'code',
        key: 'code'
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'id',
        render: (id, record) => {
          return (
            <div>
              <i
                className="sugoicon sugo-edit color-grey font14 pointer hover-color-main gap-mg-base-right"
                onClick={() => this.store.openSystemEditor(true, record)}
              />
              <Popconfirm title="确认删除" onConfirm={() => this.store.destroySystemCode(record)}>
                <i className="sugoicon sugo-trash mg2l font14 color-grey pointer hover-color-red"/>
              </Popconfirm>
            </div>
          )
        }
      }
    ]
    return (
      <Modal
        title="系统管理"
        visible={vm.visibleSystemModal}
        footer={null}
        onCancel={() => {
          this.store.openSystemModal(false)
          this.store.setVMStorage({ editor_system: null })
        }}
      >
        <div className="gap-pd-base">
          <Row>
            <Col span={Main.COL_LAYOUT.LABEL}>
              代码:
            </Col>
            <Col span={Main.COL_LAYOUT.WRAPPER}>
              <Input
                type="text"
                value={SystemCode.code}
                onChange={e => this.store.setSystemModel({ code: e.target.value })}
              />
              {(Message.code) ? (<p className="color-red">{Message.code}</p>) : null}
            </Col>
          </Row>
          <Row className="gap-pd-base-top">
            <Col span={Main.COL_LAYOUT.LABEL}>
              系统:
            </Col>
            <Col span={Main.COL_LAYOUT.WRAPPER}>
              <Input
                type="text"
                value={SystemCode.name}
                onChange={e => this.store.setSystemModel({ name: e.target.value })}
              />
              {(Message.name) ? (<p className="color-red">{Message.name}</p>) : null}
            </Col>
          </Row>
          <div className="gap-pd-base-top">
            {
              !storage.editor_system ? (
                <Button
                  disabled={disabled}
                  type="primary"
                  onClick={() => this.store.addSystem()}
                >添加</Button>
              ) : ([
                <Button
                  disabled={disabled}
                  key={0}
                  type="primary"
                  onClick={() => this.store.updateSystem()}
                >更新</Button>,
                <Button
                  key={1}
                  className="gap-mg-base-left"
                  type="primary"
                  onClick={() => this.store.setVMStorage({ editor_system: null })}
                >返回</Button>
              ])
            }
          </div>
        </div>
        {/* system list */}
        <div className="border-top border-style-dashed gap-pd-base-top">
          <p className="gap-pd-base-bottom">已创建的系统列表</p>
          <div className="gap-pd-base-bottom">
            <Input
              className="width-percent-100"
              type="text"
              onChange={e => this.store.setVMStorage({ filter_system: e.target.value })}
            />
          </div>
          <div className="modal-list-height overflow-auto-y">
            <Table
              size="small"
              columns={columns}
              dataSource={vm.systems.filter(r => storage.filter_system ? r.name.indexOf(storage.filter_system) !== -1 : true)}
              rowKey="id"
            />
          </div>
        </div>
      </Modal>
    )
  }

  renderModuleModal() {
    const { vm, ModuleCode } = this.state
    const storage = vm.storage
    const Message = _.isObject(ModuleCode.message) ? ModuleCode.message : {}
    const disabled = !!(ModuleCode.system_id === null ||
      ModuleCode.code === null ||
      Message.system_id ||
      Message.code)

    const SystemMaps = Main.modelMapCreator(vm.systems, 'id')
    const columns = [
      {
        title: '系统名称',
        dataIndex: 'system_id',
        key: 'system_name',
        render(system_id) {
          return SystemMaps.get(system_id).name
        }
      },
      {
        title: '系统代码',
        dataIndex: 'system_id',
        key: 'system_code',
        render(system_id) {
          return SystemMaps.get(system_id).code
        }
      },
      {
        title: '产品线',
        dataIndex: 'code',
        key: 'code'
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'id',
        render: (id, record) => {
          return (
            <div>
              <i
                className="sugoicon sugo-edit color-grey font14 pointer hover-color-main gap-mg-base-right"
                onClick={() => this.store.openModuleEditor(true, record)}
              />
              <Popconfirm title="确认删除" onConfirm={() => this.store.destroyModuleCode(record)}>
                <i className="sugoicon sugo-trash mg2l font14 color-grey pointer hover-color-red"/>
              </Popconfirm>
            </div>
          )
        }
      }
    ]

    return (
      <Modal
        title="产品线管理"
        visible={vm.visibleModuleModal}
        footer={null}
        onCancel={() => {
          this.store.openModuleModal(false)
          this.store.setVMStorage({ editor_module: null })
        }}
      >
        <div className="gap-pd-base">
          <Row>
            <Col span={Main.COL_LAYOUT.LABEL}>
              系统:
            </Col>
            <Col span={Main.COL_LAYOUT.WRAPPER}>
              <Select
                allowClear
                disabled={!!vm.storage.editor_module}
                className="width-percent-100"
                value={ModuleCode.system_id}
                onChange={system_id => this.store.setModuleModel({ system_id })}
              >
                {vm.systems.map(r => (<Option key={r.id} value={r.id}>{r.name}</Option>))}
              </Select>
              {(Message.system_id) ? (<p className="color-red">{Message.system_id}</p>) : null}
            </Col>
          </Row>
          <Row className="gap-pd-base-top">
            <Col span={Main.COL_LAYOUT.LABEL}>
              产品线:
            </Col>
            <Col span={Main.COL_LAYOUT.WRAPPER}>
              <Input
                type="text"
                value={ModuleCode.code}
                onChange={e => this.store.setModuleModel({ code: e.target.value })}
              />
              {(Message.code) ? (<p className="color-red">{Message.code}</p>) : null}
            </Col>
          </Row>
          <div className="gap-pd-base-top">
            {
              !vm.storage.editor_module ? (
                <Button
                  type="primary"
                  disabled={disabled}
                  onClick={() => this.store.addModule()}
                >添加</Button>
              ) : ([
                <Button
                  key={0}
                  type="primary"
                  disabled={disabled}
                  onClick={() => this.store.updateModule()}
                >更新</Button>,
                <Button
                  key={1}
                  className="gap-mg-base-left"
                  type="primary"
                  onClick={() => this.store.setVMStorage({
                    editor_module: null
                  })}
                >返回</Button>
              ])
            }
          </div>
        </div>
        <div className="border-top border-style-dashed gap-pd-base-top">
          <p className="gap-pd-base-bottom">已创建的产品线列表</p>
          <div className="gap-pd-base-bottom">
            <Input
              className="width-percent-100"
              type="text"
              onChange={e => this.store.setVMStorage({ filter_module: e.target.value })}
            />
          </div>
          <div className="modal-list-height overflow-auto-y">
            <Table
              size="small"
              columns={columns}
              dataSource={vm.modules.filter(r => storage.filter_module ? r.code.indexOf(storage.filter_module) !== -1 : true)}
              rowKey="id"
            />
          </div>
        </div>
      </Modal>
    )
  }

  renderInterfaceModal() {
    const { vm, InterfaceCode } = this.state
    const storage = vm.storage
    const Message = _.isObject(InterfaceCode.message) ? InterfaceCode.message : {}
    const disabled = !!(InterfaceCode.system_id === null ||
      InterfaceCode.module_id === null ||
      InterfaceCode.code === null ||
      InterfaceCode.name === null ||
      Message.system_id ||
      Message.module_id ||
      Message.code ||
      Message.name)

    const SystemMaps = Main.modelMapCreator(vm.systems, 'id')
    const ModuleMaps = Main.modelMapCreator(vm.modules, 'id')

    const columns = [
      {
        title: '系统名称',
        dataIndex: 'system_id',
        key: 'system_name',
        render(system_id) {
          return SystemMaps.get(system_id).name
        }
      },
      {
        title: '系统代码',
        dataIndex: 'system_id',
        key: 'system_code',
        render(system_id) {
          return SystemMaps.get(system_id).code
        }
      },
      {
        title: '产品线',
        dataIndex: 'module_id',
        key: 'module_id',
        render(module_id) {
          return ModuleMaps.get(module_id).code
        }
      },
      {
        title: '接口方代码',
        dataIndex: 'code',
        key: 'code'
      },
      {
        title: '接口方名称',
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: '操作',
        dataIndex: 'id',
        key: 'id',
        render: (id, record) => {
          return (
            <div>
              <i
                className="sugoicon sugo-edit color-grey font14 pointer hover-color-main gap-mg-base-right"
                onClick={() => this.store.openInterfaceEditor(true, record)}
              />
              <Popconfirm title="确认删除" onConfirm={() => this.store.destroyInterfaceCode(record)}>
                <i className="sugoicon sugo-trash mg2l font14 color-grey pointer hover-color-red"/>
              </Popconfirm>
            </div>
          )
        }
      }
    ]

    return (
      <Modal
        title="接口方管理"
        visible={vm.visibleInterfaceModal}
        footer={null}
        onCancel={() => {
          this.store.openInterfaceModal(false)
          this.store.setVMStorage({ editor_inter: null })
        }}
      >
        <div className="gap-pd-base">
          <Row>
            <Col span={Main.COL_LAYOUT.LABEL}>
              系统:
            </Col>
            <Col span={Main.COL_LAYOUT.WRAPPER}>
              <Select
                allowClear
                disabled={!!vm.storage.editor_inter}
                value={InterfaceCode.system_id}
                className="width-percent-100"
                onChange={system_id => this.store.setInterfaceModel({ system_id, module_id: null })}
              >
                {vm.systems.map(r => (<Option key={r.id} value={r.id}>{r.name}</Option>))}
              </Select>
              {(Message.system_id) ? (<p className="color-red">{Message.system_id}</p>) : null}
            </Col>
          </Row>
          <Row className="gap-pd-base-top">
            <Col span={Main.COL_LAYOUT.LABEL}>
              产品线:
            </Col>
            <Col span={Main.COL_LAYOUT.WRAPPER}>
              <Select
                allowClear
                disabled={!!vm.storage.editor_inter}
                value={InterfaceCode.module_id}
                className="width-percent-100"
                onChange={module_id => this.store.setInterfaceModel({ module_id })}
              >
                {
                  vm.modules
                    .filter(r => InterfaceCode.system_id ? r.system_id === InterfaceCode.system_id : true)
                    .map(r => (<Option key={r.id} value={r.id}>{r.code}</Option>))
                }
              </Select>
              {(Message.module_id) ? (<p className="color-red">{Message.module_id}</p>) : null}
            </Col>
          </Row>
          <Row className="gap-pd-base-top">
            <Col span={Main.COL_LAYOUT.LABEL}>
              代码:
            </Col>
            <Col span={Main.COL_LAYOUT.WRAPPER}>
              <Input
                type="text"
                disabled={!!vm.storage.editor_inter}
                value={InterfaceCode.code}
                onChange={e => this.store.setInterfaceModel({ code: e.target.value })}
              />
              {(Message.code) ? (<p className="color-red">{Message.code}</p>) : null}
            </Col>
          </Row>
          <Row className="gap-pd-base-top">
            <Col span={Main.COL_LAYOUT.LABEL}>
              接口方:
            </Col>
            <Col span={Main.COL_LAYOUT.WRAPPER}>
              <Input
                type="text"
                value={InterfaceCode.name}
                onChange={e => this.store.setInterfaceModel({ name: e.target.value })}
              />
              {(Message.name) ? (<p className="color-red">{Message.name}</p>) : null}
            </Col>
          </Row>
          <div className="gap-pd-base-top">
            {
              !vm.storage.editor_inter ? (
                <Button
                  type="primary"
                  disabled={disabled}
                  onClick={() => this.store.addInterface()}
                >添加</Button>
              ) : ([
                <Button
                  key={0}
                  type="primary"
                  disabled={disabled}
                  onClick={() => this.store.updateInterface()}
                >更新</Button>,
                <Button
                  key={1}
                  className="gap-mg-base-left"
                  type="primary"
                  onClick={() => this.store.setVMStorage({ editor_inter: null })}
                >返回</Button>
              ])
            }
          </div>
        </div>
        <div className="border-top border-style-dashed gap-pd-base-top">
          <p className="gap-pd-base-bottom">已创建的接口方列表</p>
          <div className="gap-pd-base-bottom">
            <Input
              className="width-percent-100"
              type="text"
              onChange={e => this.store.setVMStorage({ filter_inter: e.target.value })}
            />
          </div>
          <div className="modal-list-height overflow-auto-y">
            <Table
              columns={columns}
              dataSource={vm.interfaces.filter(r => storage.filter_inter ? r.name.indexOf(storage.filter_inter) !== -1 : true)}
              rowKey="id"
              size="small"
            />
          </div>
        </div>
      </Modal>
    )
  }

  renderLogCodeModal() {
    const { vm, LogCode } = this.state
    const Message = _.isObject(LogCode.message) ? LogCode.message : {}
    const disabled = !!(LogCode.system_id === null ||
      LogCode.module_id === null ||
      LogCode.code === null ||
      LogCode.name === null ||
      Message.system_id ||
      Message.module_id ||
      Message.code ||
      Message.name)

    const editorModel = !!vm.storage.editor_log_code

    const panel = (
      <div className="gap-pd-base">
        <Row>
          <Col span={Main.COL_LAYOUT.LABEL}>
            系统:
          </Col>
          <Col span={Main.COL_LAYOUT.WRAPPER}>
            <Select
              allowClear
              disabled={editorModel}
              className="width-percent-100"
              value={LogCode.system_id}
              onChange={system_id => this.store.setLogCodeModel({ system_id, module_id: null })}
            >
              {vm.systems.map(r => (<Option key={r.id} value={r.id}>{r.name}</Option>))}
            </Select>
            {(Message.system_id) ? (<p className="color-red">{Message.system_id}</p>) : null}
          </Col>
        </Row>
        <Row className="gap-pd-base-top">
          <Col span={Main.COL_LAYOUT.LABEL}>
            产品线:
          </Col>
          <Col span={Main.COL_LAYOUT.WRAPPER}>
            <Select
              allowClear
              disabled={editorModel}
              value={LogCode.module_id}
              className="width-percent-100"
              onChange={module_id => this.store.setLogCodeModel({ module_id })}
            >
              {
                vm.modules
                  .filter(r => LogCode.system_id ? r.system_id === LogCode.system_id : true)
                  .map(r => (<Option key={r.id} value={r.id}>{r.code}</Option>))
              }
            </Select>
            {(Message.module_id) ? (<p className="color-red">{Message.module_id}</p>) : null}
          </Col>
        </Row>
        <Row className="gap-pd-base-top">
          <Col span={Main.COL_LAYOUT.LABEL}>
            错误码:
          </Col>
          <Col span={Main.COL_LAYOUT.WRAPPER}>
            <Input
              type="text"
              value={LogCode.code}
              onChange={e => this.store.setLogCodeModel({ code: e.target.value })}
            />
            {(Message.code) ? (<p className="color-red">{Message.code}</p>) : null}
          </Col>
        </Row>
        <Row className="gap-pd-base-top">
          <Col span={Main.COL_LAYOUT.LABEL}>
            错误码描述:
          </Col>
          <Col span={Main.COL_LAYOUT.WRAPPER}>
            <Input
              type="text"
              value={LogCode.name}
              onChange={e => this.store.setLogCodeModel({ name: e.target.value })}
            />
            {(Message.name) ? (<p className="color-red">{Message.name}</p>) : null}
          </Col>
        </Row>
        <div className="gap-pd-base-top">
          {
            !vm.storage.editor_log_code ? (
              <Button
                type="primary"
                disabled={disabled}
                onClick={() => this.store.addLogCode()}
              >添加</Button>
            ) : (
              <Button
                type="primary"
                disabled={disabled}
                onClick={() => this.store.updateLogCode()}
              >更新</Button>
            )
          }
        </div>
      </div>
    )

    return (
      <Modal
        title={editorModel ? '更新错误码' : '新增错误码'}
        visible={vm.visibleLogCodeModal}
        footer={null}
        onCancel={() => {
          this.store.openLogCodeModal(false)
          this.store.setVMStorage({ editor_log_code: null })
        }}
      >
        {
          !editorModel ? (
            <Tabs defaultActiveKey="1">
              <TabPane tab="直接添加" key="1">{panel}</TabPane>
              <TabPane tab="文件上传" key="2">
                <div className="gap-pd-base-x gap-pd-base-bottom">
                  <p>文件编码请设置为utf8</p>
                  <p>
                    文件内容格式为：系统代码,产品线,错误码,错误码描述。各字段以英文逗号分隔，一条记录独占一行。
                    <Button
                      className="gap-mg-small-left"
                      size="small"
                      onClick={() => this.store.sampleFile()}
                    >
                      下载样例文件
                    </Button>
                  </p>
                </div>
                <div className="gap-pd-base-x">
                  <Upload.Dragger
                    accept="text/plain"
                    multiple={false}
                    beforeUpload={file => this.store.createLogCodeFromFile(file)}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">点击选择文件或拖动文件到此区域</p>
                  </Upload.Dragger>
                  {
                    vm.file != null
                      ? (
                        <div>
                          <p className="gap-pd-small-top">已选择文件: {vm.file.name}</p>
                          <p className="gap-pd-small-top">上传进度: {vm.progress}%</p>
                          <p className="gap-pd-small-top">成功上传: {vm.uploaded}条</p>
                          <p className="gap-pd-small-top">上传出错: {vm.uploadFaild}条</p>
                          <div className="gap-pd-small-top">
                            <Popover content={(
                              <div>
                                由于读取文件时提前缓存 <br/>
                                点击暂停后需要等待数秒才会停止上传数据 <br/>
                                等待时间受网络因素影响，网络响应时间越长，等待时间越长
                              </div>
                            )}
                            >
                              <Button
                                className="gap-mg-base-right"
                                onClick={vm.pause ? () => this.store.resume() : () => this.store.pause()}
                              >{vm.pause ? '继续上传' : '暂停'}</Button>
                            </Popover>
                          </div>
                        </div>
                      )
                      : null
                  }
                </div>
              </TabPane>
            </Tabs>
          ) : (panel)
        }
      </Modal>
    );
  }

  render() {
    return (
      <div className="height-percent-100 overflow-auto-y">
        <Bread path={[{ name: '错误码管理' }]}/>
        <div className="gap-pd-base">
          {this.renderSystemModal()}
          {this.renderModuleModal()}
          {this.renderInterfaceModal()}
          {this.renderLogCodeModal()}
          {this.renderFilterAndBtns()}
          <div className="gap-pd-large-y">
            <Spin spinning={this.state.vm.searching}>
              {this.renderTables()}
            </Spin>
          </div>
        </div>
      </div>
    )
  }
}
