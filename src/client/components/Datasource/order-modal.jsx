import React from 'react'
import { CloseCircleOutlined } from '@ant-design/icons';
import { Icon as LegacyIcon } from '@ant-design/compatible';
import { Button, Modal, message} from 'antd'
import _ from 'lodash'
import {withDataSourceCustomOrders} from '../Fetcher/data-source-custom-orders-fetcher'
import CustomOrderList from './custom-order-list'
import Fetch from '../../common/fetch-final'


class OrderModal extends React.Component {

  state = {
    loading: false
  }

  onSave = async () => {
    let {hideModal, submitCallback} = this.props

    this.setState({
      loading: true
    })
    let nextOrder = this._customOrderList.generateNextOrders()
    let res = await this.updateCustomOrders(nextOrder)
    this.setState({
      loading: false
    })
    if (!res) return
    message.success('更新成功', 2)
    submitCallback()
    hideModal()
  }

  async updateCustomOrders (nextOrders) {
    let {datasource, type} = this.props
    const dataType = 'global'
    let res
    if(type === 'dimension') {
      res = await Fetch.post(`/app/custom-orders/update/${datasource.id}`, {dimensions_order: nextOrders, dataType})
    } else {
      res = await Fetch.post(`/app/custom-orders/update/${datasource.id}`, {metrics_order: nextOrders, dataType})
    }
    return res
  }


  render () {
    let {modalVisible, data, hideModal, dataSourceCustomOrders, type} = this.props
    let {loading} = this.state
    let orderData
    let footer = (
      <div className="alignright">
        <Button
          type="ghost"
          icon={<CloseCircleOutlined />}
          className="mg1r iblock"
          onClick={hideModal}
        >取消</Button>
        <Button
          type="success"
          icon={<LegacyIcon type={loading ? 'loading' : 'check'} />}
          className="mg1r iblock"
          onClick={this.onSave}
        >{loading ? '提交中...' : '提交'}</Button>
      </div>
    )

    if(type === 'dimension') {
      orderData = dataSourceCustomOrders 
        ? dataSourceCustomOrders.dimensions_order
        : []
    } else {
      orderData = dataSourceCustomOrders 
        ? dataSourceCustomOrders.metrics_order
        : []
    }

    return (
      <Modal
        title={type === 'dimension' ? '维度设置' : '指标设置'}
        visible={modalVisible}
        width={600}
        footer={footer}
        onCancel={hideModal}
        className="datasource"
      > 
        {
          !_.isEmpty(data) 
          && <CustomOrderList
            instRef={ref => this._customOrderList = ref}
            idMapper={op => op.name}
            options={data}
            orders={orderData}
          />
        }
        
      </Modal>
    )
  }
}

let withCustomOrders = withDataSourceCustomOrders(OrderModal, props => {
  return ({
    dataSourceId: props.datasource.id,
    doFetch: !!props.datasource.id,
    dataType: 'global'
  })
})

export default withCustomOrders
