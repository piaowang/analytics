import React from 'react'
import Bread from '../Common/bread'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Input, message, Select } from 'antd';
import {OfflineCalcDataSourceDefaultSchema, OfflineCalcDataSourceTypeEnum} from '../../../common/constants'
import _ from 'lodash'
import {getUsers} from '../../actions'
import {connect} from 'react-redux'
import {enableSelectSearch} from '../../common/antd-freq-use-props'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {validateFieldsByForm} from '../../common/decorators'
import {browserHistory} from 'react-router'
import {dataSourceListSagaModelGenerator} from './saga-model-generators'
import Fetch from '../Common/fetch'
import FetchFinal from '../../common/fetch-final'
import xorUtils from '../../../common/xor-utils'
import {immutateUpdate} from '../../../common/sugo-utils'
import DepartmentPicker from '../Departments/department-picker'
import {hiveDataSourcesSagaModelGenerator} from '../TaskScheduleManager2/visual-modeling/visual-modeling-saga-models'


const namespace = 'offline-calc-data-sources-edit'

const formItemLayout = {
  labelCol: { span: 6 },
  wrapperCol: { span: 14 }
}

const {Option} = Select

let mapStateToProps = (state, ownProps) => {
  const modelState = state[namespace] || {}
  const dsList = state['pick-hive-ds-name-for-offline-calc-ds-editor'] || {}
  return {
    ...modelState,
    hiveDataSources: dsList.hiveDataSources || [],
    users: _.get(state, 'common.users', [])
  }
}


@connect(mapStateToProps)
@withRuntimeSagaModel([
  hiveDataSourcesSagaModelGenerator('pick-hive-ds-name-for-offline-calc-ds-editor'),
  dataSourceListSagaModelGenerator(namespace, 'single')
])
@Form.create()
export default class OfflineCalcDataSourceEdit extends React.Component {
  
  componentDidMount() {
    this.props.dispatch(getUsers())
  }
  
  /*componentDidUpdate(prevProps, prevState, snapshot) {
    if (isDiffByPath(this.props, prevProps, 'offlineCalcDataSourcesBak')) {
      this.props.form.resetFields()
    }
  }*/
  
  onSubmit = async ev => {
    let {offlineCalcDataSources, dispatch, form, params} = this.props
    ev.preventDefault()
    let formVals = await validateFieldsByForm(form)
    if (!formVals) {
      return
    }
    // 密码加密保存
    formVals = immutateUpdate(formVals, 'connection_params.password', pwd => {
      if (pwd) {
        return xorUtils.encrypt(pwd)
      }
      let currDs = _.get(offlineCalcDataSources, [0])
      return _.get(currDs, 'connection_params.password')
    })
    
    const {hostAndPort, database, schema, user, password} = _.get(formVals, 'connection_params') || {}
    let tables = await FetchFinal.get('/app/offline-calc/data-sources/new/tables', {
      type: formVals.type,
      connection_params: {
        hostAndPort: hostAndPort,
        database,
        schema,
        user,
        password
      }
    }, {
      handleErr: err => {}
    })
    if (_.isNil(tables)) {
      message.warn('测试连接失败，无法保存')
      return
    }
    const currIdInUrl = _.get(params, 'id')
    const isCreating = currIdInUrl === 'new'
    // hive 数据源的 id 规范： hive_dbName
    if (formVals.type === OfflineCalcDataSourceTypeEnum.Hive) {
      formVals.id = `hive_${_.get(formVals, 'connection_params.database')}`
    }
    let nextDataSources = isCreating
      ? [formVals]
      : offlineCalcDataSources.map(d => d.id === currIdInUrl ? {...d, ...formVals} : d)
    await dispatch({
      type: `${namespace}/sync`,
      payload: nextDataSources,
      callback: syncRes => {
        let {resCreate, resUpdate} = syncRes || {}
        if (_.isEmpty(resCreate) && _.isEmpty(resUpdate)) {
          message.warn('没有修改数据，无须保存')
          return
        }
        if (_.isEmpty(_.compact(resCreate)) && _.isEmpty(_.compact(resUpdate))) {
          // 保存报错
          return
        }
        const isCreated = _.isEmpty(resUpdate)
        message.success((
          <span>{isCreated ? '创建' : '修改'}数据源成功</span>
        ))
        if (isCreated) {
          let createdId = _.get(resCreate, [0, 'result', 'id'])
          browserHistory.push(`/console/offline-calc/data-sources/${createdId}`)
          dispatch({ type: `${namespace}/fetch`, payload: createdId})
        }
      }
    })
    console.log(formVals)
  }
  
  renderTindexConfigForm = () => {
    let {users, params, offlineCalcDataSources} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
  
    let currDs = _.get(offlineCalcDataSources, [0])
    const isCreating = _.get(params, 'id') === 'new'
    return (
      <React.Fragment>
        <Form.Item
          label="服务器地址"
          {...formItemLayout}
        >
          {getFieldDecorator('connection_params.hostAndPort', {
            initialValue: _.get(currDs, 'connection_params.hostAndPort'),
            rules: [
              { required: true, pattern: /^.+:\d+$/, message: '请输入 IP 和 端口' }
            ]
          })(<Input />)}
        </Form.Item>
      </React.Fragment>
    );
  }
  
  renderHiveConfigForm = () => {
    let {users, params, offlineCalcDataSources, hiveDataSources} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
  
    let currDs = _.get(offlineCalcDataSources, [0])
    const isCreating = _.get(params, 'id') === 'new'
    return (
      <React.Fragment>
        <Form.Item
          label="数据库"
          {...formItemLayout}
        >
          {getFieldDecorator('connection_params.database', {
            initialValue: _.get(currDs, 'connection_params.database') || 'default',
            rules: [
              { required: true, message: '未选择数据库' }
            ]
          })(
            <Select>
              {(hiveDataSources || []).map(hd => {
                return (
                  <Option key={hd.name}>{hd.name}</Option>
                )
              })}
            </Select>
          )}
        </Form.Item>
      </React.Fragment>
    )
  }
  
  renderNormalDbConfigForm = () => {
    let {users, params, offlineCalcDataSources} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    
    let currDs = _.get(offlineCalcDataSources, [0])
    const isCreating = _.get(params, 'id') === 'new'
    return (
      <React.Fragment>
        <Form.Item
          label="服务器地址"
          {...formItemLayout}
        >
          {getFieldDecorator('connection_params.hostAndPort', {
            initialValue: _.get(currDs, 'connection_params.hostAndPort'),
            rules: [
              { required: true, pattern: /^.+:\d+$/, message: '未输入 IP 和 端口' }
            ]
          })(<Input />)}
        </Form.Item>
        
        <Form.Item
          label="数据库"
          {...formItemLayout}
        >
          {getFieldDecorator('connection_params.database', {
            initialValue: _.get(currDs, 'connection_params.database'),
            rules: [
              { required: true, message: '未输入数据库名称' }
            ]
          })(<Input />)}
        </Form.Item>
        
        {(()=>{
          let type = getFieldValue('type')
          let typeStr = _.findKey(OfflineCalcDataSourceTypeEnum, v => v === type)
          if (!(typeStr && (typeStr in OfflineCalcDataSourceDefaultSchema))) {
            return null
          }
          const defaultSchema = OfflineCalcDataSourceDefaultSchema[typeStr]
          return (
            <Form.Item
              label="数据库架构"
              {...formItemLayout}
            >
              {getFieldDecorator('connection_params.schema', {
                initialValue: _.get(currDs, 'connection_params.schema') || defaultSchema,
                rules: [ ]
              })(<Input placeholder={getFieldValue('type') === OfflineCalcDataSourceTypeEnum.Db2 ? '（默认同大写用户名）' : ' (默认) '} />)}
            </Form.Item>
          )
        })()}
        
        <Form.Item
          label="用户名"
          {...formItemLayout}
        >
          {getFieldDecorator('connection_params.user', {
            initialValue: _.get(currDs, 'connection_params.user'),
            rules: [
              { required: true, message: '未输入数据库用户名' }
            ]
          })(<Input />)}
        </Form.Item>
        
        <Form.Item
          label="用户密码"
          {...formItemLayout}
        >
          {getFieldDecorator('connection_params.password', {
            // 编辑时隐藏密码，保存时为空则不修改
            initialValue: '', // _.get(currDs, 'connection_params.password') ? xorUtils.decrypt(_.get(currDs, 'connection_params.password')) : '',
            rules: isCreating ? [ { required: true, message: '未输入数据库用户密码' } ] : []
          })(<Input type="password" placeholder={isCreating ? '' : '(隐藏，不填则不修改)'} />)}
        </Form.Item>
      </React.Fragment>
    );
  }
  
  render() {
    let {users, params, offlineCalcDataSources} = this.props
    const { getFieldDecorator, getFieldValue, setFieldsValue } = this.props.form
    
    let currDs = _.get(offlineCalcDataSources, [0])
  
    const isCreating = _.get(params, 'id') === 'new'
    getFieldDecorator('id', {
      initialValue: isCreating ? undefined : _.get(params, 'id')
    })
    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '数据源管理', link: '/console/offline-calc/data-sources' },
            { name: isCreating ? '数据源创建' : '数据源编辑' }
          ]}
        />
        <div
          className="overscroll-y"
          style={{height: 'calc(100% - 44px)'}}
        >
          <Form
            onSubmit={this.onSubmit}
            className="width600 mg-auto mg3t"
          >
            <Form.Item label="名称" {...formItemLayout}>
              {getFieldDecorator('name', {
                initialValue: _.get(currDs, 'name'),
                rules: [
                  { required: true, message: '未输入数据源名称', whitespace: true },
                  { max: 32, message: '名称太长' }
                ]
              })(<Input />)}
            </Form.Item>
  
            <Form.Item label="类型" {...formItemLayout}>
              {getFieldDecorator('type', {
                initialValue: _.get(currDs, 'type', OfflineCalcDataSourceTypeEnum.MySQL)
              })(
                <Select
                  onChange={val => {
                    let typeStr = _.findKey(OfflineCalcDataSourceTypeEnum, v => v === val)
                    setFieldsValue({
                      'connection_params.hostAndPort': null,
                      'connection_params.database': null,
                      'connection_params.schema': OfflineCalcDataSourceDefaultSchema[typeStr] || null,
                      'connection_params.user': null,
                      'connection_params.password': null
                    })
                  }}
                >
                  {Object.keys(OfflineCalcDataSourceTypeEnum).map(k => {
                    // 不能选择 Hive 数据源，Hive 数据源是内置的
                    return (
                      <Option key={k} value={OfflineCalcDataSourceTypeEnum[k]}>{k}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>
  
            {getFieldValue('type') === OfflineCalcDataSourceTypeEnum.Tindex
              ? this.renderTindexConfigForm()
              : getFieldValue('type') === OfflineCalcDataSourceTypeEnum.Hive
                ? this.renderHiveConfigForm()
                : this.renderNormalDbConfigForm()}
  
            <Form.Item
              label="责任部门"
              {...formItemLayout}
            >
              {getFieldDecorator('params.supervisorDepartments', {
                initialValue: _.get(currDs, 'params.supervisorDepartments') || []
              })(
                <DepartmentPicker style={{width: '100%'}} multiple={false} />
              )}
            </Form.Item>
          
            <Form.Item label="责任人" {...formItemLayout}>
              {getFieldDecorator('supervisor_id', {
                initialValue: _.get(currDs, 'supervisor_id', _.get(window.sugo, 'user.id'))
              })(
                <Select
                  allowClear
                  {...enableSelectSearch}
                >
                  {(users || []).map(user => {
                    const {first_name, username} = user || {}
                    return (
                      <Option
                        key={user.id}
                        value={user.id}
                      >{first_name ? `${first_name}(${username})` : username}</Option>
                    )
                  })}
                </Select>
              )}
            </Form.Item>
  
            <Form.Item label="业务口径" {...formItemLayout}>
              {getFieldDecorator('description', {
                initialValue: _.get(currDs, 'description')
              })(<Input />)}
            </Form.Item>
  
            <Form.Item
              label={'\u00a0'}
              colon={false}
              {...formItemLayout}
            >
              <Button
                type="primary"
                htmlType="submit"
              >{isCreating ? '确认新建' : '保存修改'}</Button>
  
              <Fetch
                url={'/app/offline-calc/data-sources/new/tables'}
                lazy
                onError={err => { }}
              >
                {({isFetching, fetch}) => {
                  return (
                    <Button
                      type="success"
                      className="fright"
                      loading={isFetching}
                      onClick={async () => {
                        const hostAndPort = getFieldValue('connection_params.hostAndPort')
                        const database = getFieldValue('connection_params.database')
                        const schema = getFieldValue('connection_params.schema')
                        const user = getFieldValue('connection_params.user')
                        const password = isCreating
                          ? getFieldValue('connection_params.password')
                          : (getFieldValue('connection_params.password') || xorUtils.decrypt(_.get(currDs, 'connection_params.password') || ''))
                        const type = getFieldValue('type')
                        let tables = await fetch({
                          type: type,
                          connection_params: { hostAndPort, database, schema, user, password: password && xorUtils.encrypt(password) }
                        })
                        if (_.isNil(tables)) {
                          message.warn('无法连接到此服务器')
                          return
                        }
                        message.success('连接成功')
                      }}
                    >测试连接</Button>
                  )
                }}
              </Fetch>
            
            </Form.Item>
          </Form>
        </div>
      </React.Fragment>
    )
  }
}
