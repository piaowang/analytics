import React from 'react'
import { Table, Select, Modal, message } from 'antd'
import {connect} from 'react-redux'
import Fetch from '../../../common/fetch-final'
import { sagaSyncModel } from '../../Fetcher/saga-sync'
import withRuntimeSagaModel from '../../Common/runtime-saga-helper'
import _ from 'lodash'
import * as actions from '../../../actions/institutions'
import { bindActionCreators } from 'redux'

const { Option } = Select
const columns = [
  {
    title: '标题',
    dataIndex: 'title'
  }
]

export default class App extends React.Component {
  state = {
    selectedRowKeys: [],
    ground: ''
  }

  onSelectChange = selectedRowKeys => {
    this.setState({ selectedRowKeys })
  };

  modalIsOk = () => {
    let { selectedRowKeys, ground } = this.state
    const {  selectedCategoryId, list=[], doUpdateLiveScreen } = this.props
    let filteList = []
    if (selectedCategoryId === '') {
      filteList = list.filter(item => item.category_id === null)
    }else if (selectedCategoryId === 'default') {
      filteList = list.filter(item => item.category_id === '')
    }else{
      filteList = list.filter(item => item.category_id === selectedCategoryId)
    }
    if (_.isEmpty(selectedRowKeys &&  ground)) {
      message.warning('未选择分组或者大屏')
    }else{
      let selectedList = filteList.filter((item, idx) => _.includes(selectedRowKeys, idx))
      list.forEach( s => {
        _.findIndex(selectedList ,s)>=0 
          ? doUpdateLiveScreen(s.id, { ...s, category_id:  ground !== '默认组' ? ground : '' }) 
          : ''
      })
    }
    this.modalIsCancel()
  }

  modalIsCancel = () => {
    const { setChangeGroungVisible } = this.props
    this.setState({ 
      ground: '',
      selectedRowKeys: []
    })
    setChangeGroungVisible()
  }

  render() {
    const { selectedRowKeys } = this.state
    const { categoryList=[], selectedCategoryId, list=[], changeGroungVisible } = this.props
    let filterCategoryList = []
    let filteList = []
    if (selectedCategoryId === '') {
      filterCategoryList = categoryList.filter(item => item.id !== selectedCategoryId) 
      filterCategoryList.push({id: '默认组', title: '默认组'})
      filteList = list.filter(item => item.category_id === null)
    }else if (selectedCategoryId === 'default') {
      filterCategoryList = categoryList 
      filteList = list.filter(item => item.category_id === '')
    }else{
      filterCategoryList = categoryList.filter(item => item.id !== selectedCategoryId) 
      filterCategoryList.push({id: '默认组', title: '默认组'})
      filteList = list.filter(item => item.category_id === selectedCategoryId)
    }
    
    const rowSelection = {
      selectedRowKeys,
      onChange: this.onSelectChange
    }
    const data = filteList.map((item, idx) => {
      return {
        key: idx,
        title: item.title
      }
    })
    return (
      <Modal
        title="修改分组"
        visible={changeGroungVisible}
        onOk={this.modalIsOk}
        onCancel={this.modalIsCancel}
      >
        <div className="pd1b">
          选择分组名称：
          <Select
            showSearch
            style={{ width: 200 }}
            placeholder="选择分组名称"
            onChange={(val) => {
              this.setState({
                ground: val
              })
            }}
          >
            {
              filterCategoryList.map( item => <Option key={item.id} value={item.id}>{item.title}</Option> )
            }
          </Select>
        </div>
        <Table 
          rowSelection={rowSelection}
          columns={columns}
          dataSource={data} 
          pagination={
            {pageSize: 10}
          }
        />
      </Modal>
    )
  }
}
