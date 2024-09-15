import { Button, Checkbox, message, Modal, Upload } from 'antd'
import React, { useState } from 'react'
import _ from 'lodash'
import { forAwaitAll, immutateUpdate } from '../../../common/sugo-utils'
import Fetch from '../../common/fetch-final'
import { UploadOutlined } from '@ant-design/icons'

const allOptions = {
  overwriteSameId: true,
  importDims: true,
  importMetrics: true,
  importSlices: true,
  importDashboards: true,
  importDataAPI: true
}
const uploadStatusEnum = {
  waiting: '等待上传',
  uploading: '上传中...',
  error: '上传失败',
  success: '上传成功'
}
export default function ProjectImporter(props) {
  const [state, setState] = useState(() => ({
    selectedFile: null,
    options: allOptions,
    preUploadData: null
  }))
  const { selectedFile, options, preUploadData } = state
  let modalVisible = !!selectedFile
  return (
    <React.Fragment>
      <Upload
        accept='.json'
        fileList={[]}
        beforeUpload={file => {
          if (1024 * 1024 * 2 < file.size) {
            // 2Mb
            message.warn('文件不能大于 2 Mb')
            return false
          }
          let fr = new FileReader()
          fr.onload = e => {
            let data = JSON.parse(e.target.result)
            setState({
              ...state,
              selectedFile: file,
              preUploadData: _.map(data, d => ({ data: d, uploadStatus: 'waiting' }))
            })
          }
          fr.readAsText(file)
          return false
        }}
      >
        <Button icon={<UploadOutlined />} className='mg1l iblock'>
          导入项目
        </Button>
      </Upload>
      {!modalVisible ? null : (
        <Modal
          title='准备导入项目'
          visible={modalVisible}
          onVisibleChange={visible =>
            setState({
              ...state,
              selectedFile: visible ? selectedFile : null
            })
          }
          cancelText={_.some(preUploadData, d => d.uploadStatus === 'success') ? '完成导入' : '取消'}
          onCancel={() => {
            setState({ ...state, selectedFile: null, preUploadData: null })
            if (_.some(preUploadData, d => d.uploadStatus === 'success')) {
              window.location.reload()
            }
          }}
          okButtonProps={{
            loading: _.some(preUploadData, d => d.uploadStatus === 'uploading'),
            disabled: _.some(preUploadData, d => d.uploadStatus !== 'waiting')
          }}
          onOk={async () => {
            let res = await forAwaitAll(preUploadData, async (statusAndData, idx) => {
              let { data, uploadStatus } = statusAndData
              setState(prevState => {
                return {
                  ...prevState,
                  preUploadData: immutateUpdate(prevState.preUploadData, [idx, 'uploadStatus'], () => 'uploading')
                }
              })

              let res = await Fetch.post('/app/project/import', null, {
                body: JSON.stringify({
                  data,
                  opts: options
                })
              })
              setState(prevState => {
                return {
                  ...prevState,
                  preUploadData: immutateUpdate(prevState.preUploadData, [idx, 'uploadStatus'], () => {
                    return res && res.success ? 'success' : 'error'
                  })
                }
              })
            })
            console.log('import project result: ', res)
          }}
        >
          <Checkbox.Group
            options={[
              { label: '覆盖同 ID 项（不选则跳过同 ID 项）', value: 'overwriteSameId' },
              { label: '导入维度', value: 'importDims' },
              { label: '导入指标', value: 'importMetrics' },
              { label: '导入单图', value: 'importSlices' },
              { label: '导入看板', value: 'importDashboards' },
              { label: '导入数据 API', value: 'importDataAPI' }
            ]}
            value={_.keys(options).filter(k => options[k])}
            onChange={checkedValues => {
              setState({
                ...state,
                options: _.mapValues(allOptions, (v, k) => _.includes(checkedValues, k))
              })
            }}
          />

          <div className='mg2t'>待导入项目：</div>
          <ul className='height200 border overscroll-auto-y'>
            {_.map(preUploadData, statusAndData => {
              let { data, uploadStatus } = statusAndData
              return <li>{`${_.get(data, 'project.name')}（${uploadStatusEnum[uploadStatus]}）`}</li>
            })}
          </ul>
        </Modal>
      )}
    </React.Fragment>
  )
}
