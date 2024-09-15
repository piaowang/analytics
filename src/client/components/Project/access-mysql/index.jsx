import React from 'react'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Button, Col, Input, message, Row } from 'antd';
import {validateFieldsAndScroll} from '../../../common/decorators'
import {withPoster} from '../../Fetcher/poster'
import Bread from '../../Common/bread'
import {browserHistory} from 'react-router'
import Steps from '../../Common/access-steps'
import _ from 'lodash'
import {synchronizer} from '../../Fetcher/synchronizer'
import xorUtil from '../../../../common/xor-utils'
import Fetch from '../../../common/fetch-final'

const FormItem = Form.Item

const formItemLayout = {
  labelCol: { span: 5 },
  wrapperCol: { span: 17 }
}

@Form.create()
@validateFieldsAndScroll
export default class MySQLAccessor extends React.Component {
  state = {
  }

  renderForm = synchronizer(_.identity)(dataSourceSyncer => {
    const {form} = this.props
    const { getFieldDecorator } = form
    let dbConnectionInfo = _.get(dataSourceSyncer.dataSources, [0, 'params', 'dbConnectionInfo']) || {}
    if (dbConnectionInfo.db_pwd) {
      dbConnectionInfo = {...dbConnectionInfo, db_pwd: xorUtil.decrypt(dbConnectionInfo.db_pwd)}
    }
    let {modifyDataSources, isSyncingDataSources } = dataSourceSyncer

    return (
      <Form layout="horizontal">
        <FormItem
          {...formItemLayout}
          label="数据库地址"
          hasFeedback
        >
          {
            getFieldDecorator('db_host', {
              initialValue: dbConnectionInfo.db_host,
              rules: [
                {
                  required: true,
                  message: '请输入 IP地址:端口'
                }, {
                  pattern: /(([0-9]{1,3}\.){3}[0-9]{1,3}|([0-9a-z_!~*'-]+\.)*([0-9a-z][0-9a-z-]{0,61})?[0-9a-z]\.[a-z]{2,6}|localhost)(:[0-9]{2,6})?(\/?)$/,
                  message: '输入不正确'
                }
              ]
            })(
              <Input placeholder="ip地址:端口" />
            )
          }
        </FormItem>

        <FormItem {...formItemLayout} label="数据库名称" hasFeedback>
          {
            getFieldDecorator('db_name', {
              initialValue: dbConnectionInfo.db_name,
              rules: [
                {
                  required: true,
                  message: '请输入数据库名称'
                }
              ]
            })(
              <Input placeholder="数据库名称" />
            )
          }
        </FormItem>

        <FormItem {...formItemLayout} label="数据库表名称" hasFeedback>
          {
            getFieldDecorator('table_name', {
              initialValue: dbConnectionInfo.table_name,
              rules: [
                {
                  required: true,
                  message: '请输入数据库表名称'
                }
              ]
            })(
              <Input placeholder="数据库表名称" />
            )
          }
        </FormItem>

        <FormItem {...formItemLayout} label="数据库账号" hasFeedback>
          {
            getFieldDecorator('db_user', {
              initialValue: dbConnectionInfo.db_user,
              rules: [
                {
                  required: true,
                  message: '请输入数据库账号'
                }
              ]
            })(
              <Input
                placeholder="数据库账号"
                autoComplete={'off'}
              />
            )
          }
        </FormItem>

        <FormItem {...formItemLayout} label="数据库密码" hasFeedback>
          {
            getFieldDecorator('db_pwd', {
              initialValue: dbConnectionInfo.db_pwd,
              rules: [
                {
                  required: true,
                  message: '请输入数据库密码'
                }
              ]
            })(
              <Input
                type="password"
                placeholder="数据库密码"
                autoComplete={'off'}
              />
            )
          }
        </FormItem>

        <FormItem {...formItemLayout} label="主时间维度名称" hasFeedback>
          {
            getFieldDecorator('db_time_dim_name', {
              initialValue: dbConnectionInfo.db_time_dim_name,
              rules: [ ]
            })(
              <Input placeholder="主时间维度名称" />
            )
          }
        </FormItem>

        <FormItem {...formItemLayout} label="数据库时区" hasFeedback>
          {
            getFieldDecorator('db_timezone', {
              initialValue: dbConnectionInfo.db_timezone,
              rules: [
                {
                  type: 'string',
                  pattern: /^[+\-]\d{1,2}:\d{1,2}$/,
                  message: '不符合时区格式，最终格式应类似 +08:00 或 -02:00'
                }
              ]
            })(
              <Input placeholder="+08:00" />
            )
          }
        </FormItem>

        <Row>
          <Col span={22} className="alignright mg2b">
            注意：浏览器会同步记住登录账号及密码，请用户修改数据库账号/密码为数据库的账号及密码
          </Col>
        </Row>

        <Row className="mg2b">
          <Col span={22} className="alignright">
            {this.renderTestBtn({
              url: '/app/businessdbsetting/test',
              doFetch: false
            })}

            <Button
              className="mg2l"
              loading={isSyncingDataSources}
              type="primary"
              onClick={async () => {
                let fieldVals = await this.validateFieldsAndScroll()
                if (!fieldVals) {
                  return
                }
                // console.log('fieldVals: ', fieldVals)
                let {project: projectCurrent, form} = this.props
                // 除了修改 dbConnectionInfo，还要修改 sugo_datasources.name, sugo_projects.datasource_name 为 table_name
                try {
                  if (fieldVals.table_name !== projectCurrent.datasource_name) {
                    let updateDataSourceNameRes = await Fetch.post('/app/project/update', {
                      id: projectCurrent.id,
                      name: projectCurrent.name, // 不变
                      datasource_name: fieldVals.table_name
                    })
                    if (!_.get(updateDataSourceNameRes, 'result.success')) {
                      throw new Error(`修改数据库名称失败，${_.get(updateDataSourceNameRes, 'result.message') || '未知原因'}`)
                    }
                    // console.log('update dataSource Name res: ', updateDataSourceNameRes, res)
                  }
                  let res = await modifyDataSources('[0].params.dbConnectionInfo', prev => {
                    return {...(prev || {}), ...fieldVals, db_pwd: xorUtil.encrypt(fieldVals.db_pwd)}
                  })

                  // console.log('save res: ', res)
                  message.success('保存成功')
                } catch (e) {
                  message.warn(`保存失败：${e.message || e}`)
                }
              }}
            >
              保存连接信息
            </Button>
          </Col>
        </Row>
      </Form>
    );
  })

  renderTestBtn = withPoster(_.identity)(poster => {
    return (
      <Button
        onClick={async () => {
          const {form} = this.props
          let fieldVals = await this.validateFieldsAndScroll()
          if (!fieldVals) {
            return
          }
          let res = await poster.fetch({
            db_type: 'mysql',
            ...fieldVals,
            db_jdbc: `${fieldVals.db_host}/${fieldVals.db_name}`,
            db_pwd: xorUtil.encrypt(fieldVals.db_pwd),
            encrypted: true
          })
          if (res && res.success) {
            if (fieldVals.db_time_dim_name && !_.some(res.result, {field_name: fieldVals.db_time_dim_name})) {
              message.warn(`该数据库不存在时间维度：${fieldVals.db_time_dim_name}`)
            }
            message.success('数据库连接成功')
          } else {
            message.warn('数据库连接失败')
          }
        }}
        loading={poster.isFetching}
      >
        测试连接
      </Button>
    )
  })

  renderSteps = () => {
    let steps = ['选择导入方式', '设置 MySQL 数据库连接'].map(title => ({title}))
    return (
      <div className="pd2t pd1b pd3x" >
        <Steps
          steps={steps}
          current={1}
        />
      </div>
    )
  }

  render() {
    let {project: projectCurrent, form} = this.props

    return (
      <div className="height-100 overscroll-y bg-white access-sdk access-collector">
        <Bread
          path={[
            { name: '项目管理', link: '/console/project' },
            { name: 'MySQL 表查询' }
          ]}
        >
          <Button
            className="mg1l"
            onClick={() => browserHistory.push('/console/project')}
          >返回</Button>
        </Bread>

        {this.renderSteps()}

        <div className="mg-auto pd2x pd2b" style={{width: 700}}>
          {this.renderForm({
            url: method => {
              const dict = {
                GET: 'get',
                PUT: 'update'
              }
              return `/app/datasource/${dict[method]}`
            },
            doSync: true,
            query: {
              where: { id: projectCurrent && projectCurrent.datasource_id }
            },
            modelName: 'dataSources',
            doFetch: !!projectCurrent,
            onLoaded: data => {
              form.resetFields()
            }
          })}
        </div>
      </div>
    )
  }
}
