import React from 'react'
import { Popconfirm, Table, message } from 'antd';
import { Link } from 'react-router'
import Bread from '../Common/bread'
import moment from 'moment'
import {loadLinesOfCSVFromURL} from '../../common/read-csv-from-url'
import {withUploadedFiles} from '../Fetcher/uploaded-files-fetcher'
import _ from 'lodash'
import {withSizeProvider} from '../Common/size-provider'

class FileDetail extends React.Component {
  state = {
    csvData: []
  }

  async loadCSVByFileId(fileId) {
    let dataWithHeader = await loadLinesOfCSVFromURL(`/app/uploaded-files/download/${fileId}`, {limit: 100})

    let header = dataWithHeader.columns
    let result = dataWithHeader.map(arr => _.zipObject(header, arr))
    result.columns = header
    return result
  }

  async componentDidMount() {
    let {params} = this.props
    try {
      let csvPreviewData = await this.loadCSVByFileId(params.fileId)
      this.setState({csvData: csvPreviewData})
    } catch (e) {
      if (/not\s+found/i.test(e)) {
        message.warn('文件不存在，无法读取')
      }
    }
  }

  createTableColumns() {
    let {csvData} = this.state
    let columns = csvData.columns || []

    return columns.map((col, idx) => {
      return {
        title: col,
        key: col,
        dataIndex: col,
        className: idx === 0 ? 'table-col-pd3l' : undefined,
        width: 150
      }
    })
  }

  render() {
    let {files, spWidth} = this.props
    let {csvData} = this.state

    let file = files[0] || {}

    const columns = this.createTableColumns()
    let contentWidth = columns.length * 150
    return (
      <div className="height-100 bg-white loss-predict-theme">
        <Bread
          path={[
            {name: '流失预测', link: '/console/loss-predict'},
            {name: '历史文件记录', link: '/console/loss-predict/file-histories'},
            {name: file.name}
          ]}
        />

        <div className="mg2y mg3x">
          文件说明：这里记录上传文件的数据列表情况，默认显示 100 条记录。
        </div>

        <Table
          className="pd3t bordert dashed overscroll-y"
          style={{height: `calc(100% - ${49 + 32 + 19}px)`}}
          bordered
          size="small"
          rowKey="id"
          pagination={{
            showQuickJumper: true,
            showSizeChanger: true
          }}
          columns={columns}
          dataSource={csvData}
          scroll={{x: spWidth < contentWidth ? contentWidth : '100%'}}
        />
      </div>
    )
  }
}

export default (()=>{
  let WithSizeProvider = withSizeProvider(FileDetail)
  return withUploadedFiles(WithSizeProvider, props => ({fileId: props.params.fileId}))
})()
