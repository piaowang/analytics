import React from 'react'

import { CloseCircleOutlined, ExclamationCircleOutlined, InboxOutlined, InfoCircleOutlined } from '@ant-design/icons'

import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'

import { Upload, message, Button, Spin, Tooltip, Table } from 'antd'
import { Link } from 'react-router'
import _ from 'lodash'
import reader from '../../common/file-reader'
import setStatePromiseDec from '../../common/set-state-promise'
import { Auth } from '../../common/permission-control'
import Search from '../Common/search'
import { getInsightUrlByUserGroup } from '../../common/usergroup-helper'
import { Anchor } from '../Common/anchor-custom'

const { cdn } = window.sugo
const FormItem = Form.Item
const Dragger = Upload.Dragger

@setStatePromiseDec
export default class UgUpload extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      result: [],
      reading: false,
      search: ''
    }
  }

  // shouldComponentUpdate(prevProps, nextState) {
  //   return !_.isEqual(this.props, prevProps) ||
  //          !_.isEqual(this.state, nextState)
  // }

  readFile = async file => {
    await this.setStatePromise({
      reading: true
    })
    let res = await reader(file)
    if (res.error) {
      this.setState({
        reading: false
      })
      return message.error(res.error.stasck || res.error)
    }
    let result = _.uniq(res.split(/[\s,，]+/).filter(id => id !== ''))
    await this.setStatePromise({
      reading: false
    })

    this.props.onChangeUploadResult(result)
  }

  beforeUpload = file => {
    if (!/\.txt$/.test(file.name)) return message.error('仅支持上传.txt结尾的文本文件', 10)
    this.readFile(file)
    return false
  }

  onChangeFile = () => {
    //console.log(info)
  }

  removeTag = id => {
    return () => {
      let { uploadResult } = this.props
      let res = _.without(uploadResult, id)
      this.props.onChangeUploadResult(res)
    }
  }

  onChange = e => {
    this.setState({
      search: e.target.value
    })
  }

  render() {
    let { usergroup, formItemLayout, uploadResult, hasUpload, uploadedUserGroup } = this.props
    let { reading, search } = this.state
    // let { groupby, uploadedUserGroup } = usergroup.params
    let { groupby } = usergroup.params

    // 有 uploadedUserGroup 才算是上传了的分群
    if (usergroup.id && !_.isEmpty(uploadedUserGroup)) {
      return (
        <FormItem {...formItemLayout} label='注释'>
          <p>
            <InfoCircleOutlined />
            通过上传分群id创建的分群
            <Link to={getInsightUrlByUserGroup(usergroup)}>
              <Button type='ghost' className='mg1l'>
                查看详情
              </Button>
            </Link>
          </p>
        </FormItem>
      )
    }

    const props = {
      name: 'file',
      showUploadList: false,
      action: '/upload.do',
      onChange: this.onChangeFile,
      beforeUpload: this.beforeUpload
    }

    let tableData = uploadResult.map((id, i) => ({ id, i: i + 1 }))
    tableData = search ? tableData.slice(0).filter(ug => ug.id.indexOf(search) > -1) : tableData

    const pagination = {
      total: tableData.length,
      showSizeChanger: true,
      defaultPageSize: 20
    }

    let columns = [
      {
        title: '序号',
        key: 'i',
        dataIndex: 'i'
      },
      {
        title: groupby,
        key: 'id',
        dataIndex: 'id',
        render(text) {
          return <b>{text}</b>
        }
      },
      {
        title: '操作',
        key: 'op',
        render: (text, ug) => {
          return (
            <Tooltip title={`删除这个${groupby}`}>
              <CloseCircleOutlined className='mg2l font16 color-grey pointer' onClick={this.removeTag(ug.id)} />
            </Tooltip>
          )
        }
      }
    ]

    return (
      <FormItem {...formItemLayout} label='上传'>
        {!hasUpload ? null : (
          <div className='usergroup-upload pd2b'>
            {uploadResult.length ? (
              <div>
                <h3>
                  文件中包含的<b className='color-green'>{groupby}</b>如下:(共计<b className='color-green'>{uploadResult.length}</b>个)
                </h3>
                <div className='pd2b alignright'>
                  <Search onChange={this.onChange} value={search} placeholder='搜索' className='iblock width260' />
                </div>
                <Table columns={columns} dataSource={tableData} bordered size='small' pagination={pagination} />
              </div>
            ) : (
              <p>
                上传的文件并没有包含<b className='color-green'>{groupby}</b>
              </p>
            )}
          </div>
        )}
        <Spin tip='读取中...' spinning={reading} />
        <p>
          <ExclamationCircleOutlined className='mg1r' />
          请上传包含<b className='color-green'>{groupby}</b>的文本文件, 每行一个<b className='color-green'>{groupby}</b>.
          <Anchor href={`${cdn}/_bc/sugo-analytics-static/assets/files/example-usergroup-ids.txt`} target='_blank' download='example-usergroup-ids.txt'>
            下载样例文件
          </Anchor>
        </p>
        <Dragger {...props}>
          <p className='ant-upload-drag-icon pd3t'>
            <InboxOutlined />
          </p>
          <p className='ant-upload-text pd3b pd2t'>点击或者拖拽文件到这个区域上传</p>
        </Dragger>
      </FormItem>
    )
  }
}
