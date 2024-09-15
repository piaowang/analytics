/**
 * csv文件上传表单项
 */
import React from 'react'
import { UploadOutlined } from '@ant-design/icons';
import { message, Table, Input, Upload, Button, Modal, Select, Checkbox } from 'antd';
import { renderLabel } from './contants'
import getConditionValue from './get-condition-value'
import { ReadLineAsUint8, UTF8Parser, CSVParser } from 'next-reader'
import Fetch from '../../../common/fetch-final'
import {decideType} from '../../../../common/type-decide'
import {UploadedFileType} from '../../../../common/constants'

const Option = Select.Option

const BIG_FILE_SIZE = 1 << 15
const KEY = {
  information: 'data_set_meta_data_information',
  separators: 'column_separators',
  encoding: 'encoding'
}

@getConditionValue
export default class CsvUpload extends React.Component {
  constructor(props, context) {
    super(props, context)

    this.state = Object.assign({
      modalVisible: false,
      lines: [],
      titles: [],
      titleType: [],
      separatorsValue: '',
      encodingValue: '',
      fileList: []
    }, this.getValueState(props))

    this.setParser()

    this.nextState = null
  }

  async componentDidMount() {
    const { keyToValueMap, param } = this.props
    let url = keyToValueMap[param.key]
    if(!url) return
    let path = url.replace(window.sugo.file_server_url, '')
    let res = await Fetch.get('/app/uploaded-files/get', {path})
    
    if(res && !res.error && res.result && res.result.length) {
      let file = res.result[0]
      this._fileId = file.id
      this._fileName = file.name
      this.setState(this.getValueState(this.props))

      let fileBold = await readFileFromUrl(`/app/uploaded-files/download/${this._fileId}`)

      if(fileBold) this.beforeUpload(fileBold, true)
    }
  }

  componentWillReceiveProps(nextProps) {
    this.setState(this.getValueState(nextProps))
  }

  componentDidUpdate(prevProps, prevState) {
    if(this.state !== prevState) {
      const { separatorsValue, encodingValue } = this.state
      const pSep = prevState.separatorsValue
      const pEn = prevState.encodingValue
      if(pSep !== separatorsValue || pEn !== encodingValue) {
        this.setParser()
      }
    }
  }
  
  setParser = () => {
    const { separatorsValue, encodingValue } = this.state
    switch (encodingValue) {
      case 'UTF-8':
        this.parser = new UTF8Parser()
        break
      default:
        this.parser = new UTF8Parser()
        break
    }
    this.csv_parser = new CSVParser(separatorsValue.charCodeAt(0))
    this.encode()
  }

  getValueState(props) {//从props中提取分隔符和编码的设定值
    const { keyToValueMap, param } = props
    const separators = this.findParameterType(KEY.separators)
    const encoding = this.findParameterType(KEY.encoding)

    let state = {
      separatorsValue: keyToValueMap[KEY.separators] || separators.defaultValue,
      encodingValue: keyToValueMap[KEY.encoding] || encoding.defaultValue
    }
    if(keyToValueMap[param.key]) {
      state.fileList = [{
        uid: 1,
        name: (this._fileName || '') + '文件已上传，点击下载',
        status: 'done',
        url: keyToValueMap[param.key]
      }]
    }
    return state
  }

  beforeUpload = (file, fromUrl) => {
    this.setState({
      modalVisible: fromUrl !== true,
      lines: [],
      titles: []
    })
    this.DATA = []
    let blob = file.size > BIG_FILE_SIZE ? file.slice(0, BIG_FILE_SIZE) : file
    this.file = file

    readFile(blob, model => {
      let { no, data } = model
      this.DATA.push(data)
      this.parserLine(data, no - 1)
    }, this.onComplete, this.onError)
    if(fromUrl === true) this._upload = null
    else return new Promise(resolve => {
      this._upload = resolve
    })
  }
  
  parserLine = (data, i) => {
    if(Array.isArray(data)) return
    let line_array = []
    const { encodingValue } = this.state
    if (data.byteLength > 0) {
      if(encodingValue === 'UTF-8' && i === 0){
        // 第一行过滤BOM
        data = this.parser.filterOutBOM(data).array
      }
      
      data = this.csv_parser.parse(data)
      line_array = data.map(array => {
        return String.fromCodePoint.apply(String, this.parser.entry(array).character)
      })
    }
    this.onLine({ line: line_array, i })
  }

  encode() {
    //重新解析编码
    if(!this.DATA || !this.DATA.length) return
    this.setState({
      lines: [],
      titles: []
    }, () => {
      this.DATA.map(this.parserLine)
      this.onComplete()
    })
  }

  onLine = (data) => {
    let { lines, titles } = this.nextState || this.state
    lines = lines || []
    titles = titles || []

    if(!titles.length) {
      const defaultType = this.findTypes('attribute_value_type').defaultValue
      const defaultRole = this.findTypes('attribute_role').defaultValue
      let t = data.line.map(title => ({
        title,
        type: defaultType,
        need: true,
        role: defaultRole
      }))
      this.nextState = {'titles': t}
    } else if(lines.length < 6) {
      this.nextState = Object.assign(this.nextState, {
        'lines': lines.concat(data)
      })
    }
  }

  onComplete = () => {
    let {lines, titles} = this.nextState
    let defaultTyeps = this.buildDefaultTypes(lines)
    this.nextState.titles = titles.map((t, i) => {
      return {
        ...t,
        type: defaultTyeps[i]
      }
    })
    this.setState(this.nextState)
    this.nextState = null
  }

  onSelectType = index => {
    //选择列数据类型
    return type => {
      let titles = this.state.titles.concat()
      titles[index] = Object.assign({}, titles[index], {type})
      this.setState({titles})
    }
  }

  onSelectRole = index => {
    //选择列角色
    return role => {
      let titles = this.state.titles.concat()
      titles[index] = Object.assign({}, titles[index], {role})
      this.setState({titles})
    }
  }

  onCheck = index => {
    //勾选框
    return e => {
      let need = e.target.checked
      let titles = this.state.titles.concat()
      titles[index] = Object.assign({}, titles[index], {need})
      this.setState({titles})
    }
  }

  selectEncoding = value => {
    //选择文件编码
    const { form, getFieldId } = this.props
    const { setFieldsValue } = form
    const key = getFieldId(KEY.encoding)
    setFieldsValue({[key]: value})
  }

  separatorsChange = e => {
    //输入分格符
    let separatorsValue = e.target.value
    separatorsValue = separatorsValue[separatorsValue.length-1]
    this.setState({separatorsValue})
  }

  setSeparators = () => {
    //保存分隔符
    const { form, getFieldId } = this.props
    const { setFieldsValue } = form
    const key = getFieldId(KEY.separators)
    setFieldsValue({[key]: this.state.separatorsValue})
  }

  editColumnsName = (value, field, row, column) => {
    let titles = this.state.titles.concat()
    titles[column] = Object.assign({}, titles[column], {title: value})
    this.setState({titles})
  }
  
  tableDataSourceGenerator = () => {
    return this.state.lines.map(l => l.line)
  }

  findParameterType(key) {
    const { otherParameterTypes } = this.props.param
    return otherParameterTypes.find(p => p.key === key)
  }

  findTypes(key) {
    const valueType = this.findParameterType(KEY.information)
    return valueType ? valueType.valueType.types.find(t => t.key === key) : null
  }

  buildDefaultTypes = (lines) => {
    let exampleData = lines.slice(4, 15).map(d => d.line)
    if (!exampleData) return []
    return decideType(exampleData)
  }

  tableColumnsGenerator = () => {
    const { titles } = this.state
    const type = this.findTypes('attribute_value_type')
    const role = this.findTypes('attribute_role')
    
    const types = type.categories
    const typeDes = type.categoriesDesc
    const roles = role.categories
    const roleDes = role.categoriesDesc

    return titles.map((t, i) => {
      let { title, type, role, need } = t
      return {
        dataIndex: i,
        key: title,
        className: 'elli',
        title: (
          <div>
            <Checkbox
              onChange={this.onCheck(i)}
              checked={need}
              className="mg1b"
            >{title}</Checkbox><br/>
            <Select
              value={type}
              style={{ width: 100 }}
              onChange={this.onSelectType(i)}
              placeholder="类型"
              size="small"
            >
              {types.map((name, i) => {
                return (
                  <Option value={name} key={name}>
                    {typeDes[i]}
                  </Option>
                )
              })}
            </Select>
            <br/>
            <Select
              defaultValue={role}
              style={{ width: 100 }}
              onChange={this.onSelectRole(i)}
              placeholder="角色"
              size="small"
            >
              {roles.map((name, i) => {
                return (
                  <Option value={name} key={name}>
                    {roleDes[i]}
                  </Option>
                )
              })}
            </Select>
          </div>
        )
      }
    })
  }

  handleOk = () => {
    //保存列名，列类型，列角色信息
    this.handleCancel()
    const { titles } = this.state
    let str = titles.map((t, i) => `${i}:${t.title}.${t.need}.${t.type}.${t.role}`).join(';')
    const { form, getFieldId } = this.props
    const { setFieldsValue } = form
    const key = getFieldId(KEY.information)
    setFieldsValue({[key]: str})
    this._upload ? this._upload(this.file) : null
  }

  handleCancel = () => {
    this.setState({modalVisible: false})
  }

  openModal = () => {
    this.setState({modalVisible: true})
  }

  updateFile = async (url, file) => {//更新value，并删除旧文件（如果有）
    const { param, form, getFieldId } = this.props
    const { setFieldsValue } = form
    let {id, name} = file
    let key = getFieldId(param.key)
    setFieldsValue({[key]: url})
    if(this._fileId) await Fetch.delete(`/app/uploaded-files/delete/${this._fileId}`)
    this._fileId = id
    this._fileName = name
  }

  onChangeFile = (info) => {
    const { file, fileList } = info
    if (file.status === 'done') {
      let path = '/f/' + file.response.result.filename
      let url = window.sugo.file_server_url + path
      let newFileRecord = {
        name: file.name,
        type: UploadedFileType.CSV,
        path
      }
      Fetch.post('/app/uploaded-files/create', newFileRecord).then(res => {
        message.success(`${file.name} 上传成功`)
        this.updateFile(url, res.result)//更新value，并删除旧文件（如果有）
      }).catch(err => {
        message.error('文件上传失败: ' + err.message)
      })
    } else if (file.status === 'error') {
      let name = `${file.name} 上传失败`
      message.error(name)
      fileList.find(f => f.name === file.name).name = name
      this.setState({fileList})      
    } else if (file.status === 'uploading') {
      this.setState({fileList})
    }
  }

  onRemove = async file => {
    let fileList = this.state.fileList
    if(!file.url) {
      this.setState({fileList: fileList.filter(f => f.name !== file.name)})
    } else {
      message.error('已上传文件无法删除，可重新上传以覆盖', 5)
    }
  }

  render() {
    const { titles, modalVisible, separatorsValue, encodingValue, fileList } = this.state
    let { param, getFieldDecorator } = this.props
    let {
      key,
      fullName,
      isHidden,
      description,
      otherParameterTypes
    } = param

    const separators = otherParameterTypes[0]
    const encoding = otherParameterTypes[1]
    let options = encoding.categories.filter(o => o)
    options = ['UTF-8']

    const props = {
      name: 'file',
      showUploadList: true,
      accept: 'text/csv',
      action: '/app/uploaded-files/upload',
      onChange: this.onChangeFile,
      headers: {
        'Access-Control-Allow-Origin': '*',
        token: window.sugo.file_server_token
      },
      beforeUpload: this.beforeUpload,
      fileList,
      onRemove: this.onRemove
    }

    const dataSource = this.tableDataSourceGenerator()
    const columns = this.tableColumnsGenerator()
    return (
      <div className={'ant-form-item' + (isHidden ? ' hide' : '')}>
        {getFieldDecorator(key)(<div/>)}
        <div className="pd1b" style={{lineHeight: '32px'}}>
          {renderLabel(description, fullName)}
        </div>
        <Upload 
          {...props}
        >
          <Button>
            <UploadOutlined /> 点击选择文件
          </Button>
        </Upload>
        <Button className={'mg1t' + (titles.length ? '' : ' hide')} onClick={this.openModal}>
          更改参数
        </Button>
        <Modal 
          title="选择类型"
          visible={modalVisible}
          onOk={this.handleOk} 
          onCancel={this.handleCancel}
          maskClosable={false}
          width={1000}
        >
          <div>
            {renderLabel(separators.description, separators.fullName)}
            <Input
              autoComplete="off" 
              className="mg1y width100 mg2r"
              value={separatorsValue}
              onChange={this.separatorsChange}
              onBlur={this.setSeparators}
            />
            {renderLabel(encoding.description, encoding.fullName)}
            <Select
              value={encodingValue}
              style={{ width: 80 }}
              onChange={this.selectEncoding}
              placeholder={encoding.fullName}
              size="small"
              className="mg1"
            >
              {options.map(o => 
                (<Option value={o} key={o}>
                  {o}
                </Option>)
              )}
            </Select>
          </div>
          <Table
            scroll={{ x: true }}
            bordered
            size="small"
            columns={columns}
            dataSource={dataSource}
            pagination={false}
          />
        </Modal>
      </div>
    );
  }
}

function readFile(file, onNext, onComplete, onError) {
  const file_size = file.size
  const is_big_file = file_size > BIG_FILE_SIZE
  const max_read = BIG_FILE_SIZE


  const reader = new ReadLineAsUint8(file, {
    chunk_size: max_read,
    ignore_line_break: true,
    read_size: is_big_file ? max_read : file_size
  })

  reader.subscribe(onNext, onError, onComplete)

  onError = onError ? onError : () => {}

  reader.read()
}

//读取原始二进制数据
function readFileFromUrl(url) {
  return new Promise(resolve => {
    let xhr = new XMLHttpRequest()
    xhr.responseType = 'blob'
    xhr.onload = () => {
      if (xhr.readyState !== 4) return
      if (xhr.status < 200 || xhr.status >= 400) {
        return
      }
      var arrayBuffer = xhr.response
      resolve(arrayBuffer)
    }
    xhr.open('GET', url, true)
    xhr.setRequestHeader('Range', 'bytes=0-' + BIG_FILE_SIZE)
    xhr.setRequestHeader('If-None-Match', 'webkit-no-cache')
    try {
      xhr.send()
    }
    catch (err) {
      this._chunkError(err.message)
    }
  })
}
