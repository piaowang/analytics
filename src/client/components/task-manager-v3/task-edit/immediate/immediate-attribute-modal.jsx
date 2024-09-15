import React from 'react'
import { MinusCircleOutlined, PlusCircleOutlined } from '@ant-design/icons'
import { Input, message, Modal, Tabs } from 'antd'
import _ from 'lodash'
import './immediate-attribute-modal.styl'
import AttrForm from './immediate-attr-form'


const { TabPane } = Tabs
export default class AttributeModal extends React.Component {
  state = {
    attrList: [],
    sourceList: [{}],
    formData: [], //  表单提交数据集合
    isSubmit: false,  // 是否提交
    isDataRender: false
  }
  componentDidMount() {
    const { value } = this.props
    const { common = {}, source = [] } = value
    this.setState({
      attrList: _.map(common, function (v, k) {
        return { name: k, value: v }
      }),
      sourceList: source || []
    })
  }

  componentDidUpdate(prevProps) {
    const { value } = this.props
    if (value !== prevProps.value) {
      this.setState({
        attrList: _.reduce(value.common, (r, v, k) => {
          r.push({ name: k, value: v })
          return r
        }, []),
        sourceList: value.source || []
      })
    }
  }

  onSubmit = () => {
    const { onClose, onSave } = this.props
    const { isDataRender, attrList, sourceList = [] } = this.state
    this.setState({ isSubmit: true })
    if (sourceList.length === 0) {
      onSave({
        common: attrList,
        source: []
      })
      onClose()
      return
    }
    if (!isDataRender) {
      const params = {
        common: attrList,
        source: sourceList
      }
      onSave(params)
      onClose()
      return
    }
  }

  onDataRender = () => {
    this.setState({ isDataRender: true })
  }

  onGetFormData = () => {
    const { onClose, onSave } = this.props
    const { attrList, formData, isDataRender, sourceList } = this.state
    const params = {
      common: attrList,
      source: isDataRender ? formData : sourceList
    }
    onSave(params)
    onClose()
    return
  }

  onAddAttr = () => {
    const { attrList } = this.state
    if (_.some(attrList, p => !p.name || !p.value)) {
      message.warn('请先完善属性配置')
      return
    }
    attrList.push({ name: '', value: '' })
    this.setState({ attrList })
  }

  onDelAttr = (index) => {
    const { attrList } = this.state
    _.pullAt(attrList, index)
    this.setState({ attrList })
  }

  onAddDataSource = () => {
    const { sourceList } = this.state
    sourceList.push({ sourceType: '' })
    this.setState({ sourceList })
  }

  onDeleteDataSource = (index) => {
    const { sourceList } = this.state
    _.pullAt(sourceList, index)
    this.setState({ sourceList })
  }


  onChangeType = (index, type) => {
    const { sourceList } = this.state
    _.set(sourceList, index, { sourceType: type })
    this.setState({ sourceList })
  }

  onChaName = (index, e) => {
    const { value } = e.target
    const { attrList } = this.state
    _.set(attrList, [index, 'name'], value)
    this.setState({ attrList })
  }

  onChaValue = (index, e) => {
    const { value = {} } = e.target
    const { attrList } = this.state
    _.set(attrList, [index, 'value'], value)
    this.setState({ attrList })
  }


  render() {
    const { onClose, visible, typeData, dataSourceAllList } = this.props
    const { attrList, sourceList, formData, isSubmit } = this.state
    return (
      <Modal
        onCancel={onClose}
        onOk={this.onSubmit}
        visible={visible}
        title='任务属性'
        width={550}
        okText='确定'
        cancelText='取消'
        className='modalContainer'
      >
        <Tabs defaultActiveKey='attr' style={{ minHeight: 300 }}>
          <TabPane tab='属性配置' key='attr'>
            <div className='mg-auto aligncenter'>
              {attrList.map((item, index) => {
                return (
                  <div className='mg2b' key={`input_${index}`}>
                    <Input
                      placeholder='请输入参数名'
                      value={item.name}
                      style={{ width: 160, marginRight: 5 }}
                      onChange={e => this.onChaName(index, e)}
                      key='attr_name'
                    />
                    <Input
                      placeholder='请输入参数值'
                      value={item.value}
                      style={{ width: 180, marginRight: 10 }}
                      onChange={e => this.onChaValue(index, e)}
                      key='attr_value'
                    />
                    <span className='pd1' onClick={e => this.onDelAttr(index, e)}><MinusCircleOutlined style={{ color: 'red' }} /></span>
                  </div>
                )
              })}
            </div>
            <div 
              onClick={this.onAddAttr} 
              className='mg2l' 
              style={{ cursor: 'pointer' }}
            >
              <PlusCircleOutlined style={{ color: 'green' }} /><span> 增加一个参数</span>
            </div>
          </TabPane>
          <TabPane tab='数据源配置' key='dataSource'>
            <div style={{ maxHeight: 500, overflowY: 'scroll' }} >
              {
                (sourceList || []).map((item, index) => {
                  const len = sourceList.length
                  const itemCommon = _.get(typeData.find((p) => p.type === item.sourceType), 'common', [])
                  const filterItem = itemCommon.filter((q) => !['dbType', 'dbAlais'].includes(q.value))
                  return (
                    <AttrForm
                      onDeleteDataSource={this.onDeleteDataSource}
                      onChangeType={this.onChangeType}
                      index={index}
                      typeData={typeData}
                      dataSourceAllList={dataSourceAllList}
                      formData={formData}
                      isSubmit={isSubmit}
                      info={item}
                      filterItem={filterItem}
                      onSave={() => this.onGetFormData()}
                      formDataLen={len}
                      key={index}
                      onDataRender={this.onDataRender}
                    />
                  )
                })
              }
              <div 
                onClick={this.onAddDataSource} 
                className='mg2l' 
                style={{ 
                  cursor: 'pointer', 
                  padding: '5px 10px', 
                  border: '1px solid #ccc', 
                  borderRadius: '4px', 
                  display: 'inline-block' 
                }}
              >
                <PlusCircleOutlined style={{ color: 'green' }} /><span> 添加数据源</span>
              </div>
            </div>
          </TabPane>
        </Tabs>
      </Modal >
    )
  }
}
