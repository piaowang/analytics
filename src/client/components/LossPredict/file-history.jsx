import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons';
import { Select, Table, Input, Popconfirm, message } from 'antd';
import DateRangePicker from '../Common/time-picker'
import { Link } from 'react-router'
import Bread from '../Common/bread'
import moment from 'moment'
import {withHashState} from '../Common/hash-connector'
import {withUploadedFiles} from '../Fetcher/uploaded-files-fetcher'
import {convertDateType, isRelative} from '../../../common/param-transform'
import {withCommonFilter} from '../Common/common-filter'
import smartSearch from '../../../common/smart-search'
import {UploadedFileType} from '../../../common/constants'

const Option = Select.Option

class FileHistory extends React.Component {
  state = {
    timeFilter: '-15 days'
  }

  createTableColumns() {
    let {deleteUploadedFile, reloadFiles, fileType} = this.props
    return [
      {
        title: '序号',
        key: 'index',
        dataIndex: 'index',
        className: 'table-col-pd3l'
      }, {
        title: '上传文件名称',
        key: 'name',
        dataIndex: 'name',
        width: 320
      }, {
        title: '文件类型',
        key: 'type',
        dataIndex: 'type',
        render: (val) => {
          if (val === UploadedFileType.LossPredictTrainingData) {
            return '训练数据'
          } else if (val === UploadedFileType.LossPredictTestData) {
            return '测试数据'
          } else {
            return '未知'
          }
        }
      }, {
        title: '上传时间',
        key: 'created_at',
        dataIndex: 'created_at',
        render: (text) => moment(text).format('YYYY-MM-DD HH:mm:ss')
      }, {
        title: '操作',
        key: 'operation',
        dataIndex: 'id',
        render: (id) => {
          return (
            <div>
              <Popconfirm
                title={(
                  <div>
                    确认删除？
                    <br/>
                    <span className="color-red">
                      相关的 {fileType === UploadedFileType.LossPredictTrainingData ? '训练模型和测试结果' : '测试结果'} 也会同时删除
                    </span>
                  </div>
                )}
                onConfirm={async () => {
                  await deleteUploadedFile(id)
                  message.success('删除成功')
                  await reloadFiles()
                }}
              >
                <span className="pd1l pointer"><CloseCircleOutlined /></span>
              </Popconfirm>

              <Link className="mg2l" to={{ pathname: `/console/loss-predict/file-histories/${id}` }}>
                | 查看文件详情
              </Link>
            </div>
          );
        }
      }
    ];
  }

  render() {
    let {fileType, updateHashStateByPath, files, keywordInput: KeywordInput, searching} = this.props
    const columns = this.createTableColumns()

    let {timeFilter} = this.state

    let relativeTime = isRelative(timeFilter) ? timeFilter : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeFilter : convertDateType(relativeTime)

    let mSince = moment(since)
    let mUntil = moment(until)

    let filesWithIndex = files.filter(f => {
      let mCreateTimeOfP = moment(f.created_at)
      return mCreateTimeOfP.isAfter(mSince) && mCreateTimeOfP.isBefore(mUntil)
    })
      .filter(f => searching ? smartSearch(searching, f.name) : true)
      .map((f, i) => ({...f, index: i + 1}))
    return (
      <div className="height-100 bg-white loss-predict-theme">
        <Bread
          path={[
            {name: '流失预测', link: '/console/loss-predict'},
            {name: '历史文件记录'}
          ]}
        />

        <div className="mg3x mg2y">
          <span className="pd1r">数据类型</span>
          <Select
            value={`${fileType}`}
            className="width120"
            onChange={val => updateHashStateByPath('fileType', () => +val)}
          >
            <Option value={`${UploadedFileType.LossPredictTrainingData}`}>训练数据</Option>
            <Option value={`${UploadedFileType.LossPredictTestData}`}>测试数据</Option>
          </Select>

          <span className="mg2l pd1r">上传时间</span>
          <DateRangePicker
            className="width250"
            dateType={relativeTime}
            dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
            onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
              this.setState({timeFilter: relativeTime === 'custom' ? [since, until] : relativeTime})
            }}
          />
          <KeywordInput className="itblock mg3l width250" placeholder="请输入搜索的文件名称" />
        </div>

        <Table
          className="pd3t bordert dashed"
          size="small"
          bordered
          rowKey="id"
          columns={columns}
          dataSource={filesWithIndex}
        />
      </div>
    )
  }
}

export default (()=>{
  let WithCommonFilter = withCommonFilter(FileHistory)
  let WithFiles = withUploadedFiles(WithCommonFilter, props => ({type: props.fileType}))
  return withHashState(WithFiles, undefined, {fileType: UploadedFileType.LossPredictTrainingData})
})()
