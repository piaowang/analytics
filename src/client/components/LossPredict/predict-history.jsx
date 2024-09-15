import React from 'react'
import { CloseCircleOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Popconfirm, Table, Input } from 'antd';
import { Link } from 'react-router'
import Bread from '../Common/bread'
import moment from 'moment'
import {withLossPredictPredictions} from '../Fetcher/loss-predict-predictions-fetcher'
import {withLossPredictModels} from '../Fetcher/loss-predict-models-fetcher'
import DateRangePicker from '../Common/time-picker'
import _ from 'lodash'
import {convertDateType, isRelative} from '../../../common/param-transform'
import {checkPermission} from '../../common/permission-control'

const canCreate = checkPermission('post:/app/loss-predict/models')

class PredictHistory extends React.Component {
  state = {
    timeFilter: '-15 days'
  }

  createTableColumns() {
    let {lossPredictModels, deleteLossPredictPrediction, reloadLossPredictPredictions} = this.props

    let lossPredictModel = lossPredictModels[0] || {}

    return [
      {
        title: '序号',
        key: 'index',
        dataIndex: 'index',
        className: 'table-col-pd3l'
      }, {
        title: '流失预测分析名称',
        key: 'name',
        render: () => lossPredictModel && lossPredictModel.name
      }, {
        title: '所属模型',
        key: 'modelName',
        render: (val, record) => {
          return _.get(lossPredictModel, 'UploadedFile.name')
        }
      }, {
        title: '创建时间',
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
                title="确认删除？"
                onConfirm={async () => {
                  await deleteLossPredictPrediction(id)
                  await reloadLossPredictPredictions()
                }}
              >
                <span className="pd1l pointer"><CloseCircleOutlined /></span>
              </Popconfirm>
              <Link
                className="mg2l"
                to={{ pathname: `/console/loss-predict/${lossPredictModel.id}/predictions/${id}` }}
              >
                | 查看预测结果
              </Link>
            </div>
          );
        }
      }
    ];
  }

  render() {
    let {lossPredictModels, lossPredictPredictions, isFetchingLossPredictPredictions} = this.props

    let lossPredictModel = lossPredictModels[0] || {}

    const columns = this.createTableColumns()

    let {timeFilter} = this.state

    let relativeTime = isRelative(timeFilter) ? timeFilter : 'custom'
    let [since, until] = relativeTime === 'custom' ? timeFilter : convertDateType(relativeTime)

    let mSince = moment(since)
    let mUntil = moment(until)

    // 根据条件过滤
    let lossPredictPredictionsWithIndex = lossPredictPredictions.filter(p => {
      let mCreateTimeOfP = moment(p.created_at)
      return mCreateTimeOfP.isAfter(mSince) && mCreateTimeOfP.isBefore(mUntil)
    })
      .map((p, idx) => ({...p, index: idx + 1}))

    return (
      <div className="height-100 bg-white loss-predict-theme">
        <Bread
          path={[
            {name: '流失预测', link: '/console/loss-predict'},
            {name: lossPredictModel.name, link: `/console/loss-predict/${lossPredictModel.id}`},
            {name: '历史预测记录'}
          ]}
        >
          {!canCreate ? null : (
            <Link to={`/console/loss-predict/${lossPredictModel.id}/begin-predict`}>
              <Button
                type="primary"
                icon={<PlusCircleOutlined />}
              >新建预测分析</Button>
            </Link>
          )}
        </Bread>

        <div className="mg3x mg2y">
          <span className="mg2l pd1r">上传时间</span>
          <DateRangePicker
            className="width250"
            dateType={relativeTime}
            dateRange={[since, until].map(str => moment(str).format('YYYY-MM-DD HH:mm:ss'))}
            onChange={({ dateType: relativeTime, dateRange: [since, until] }) => {
              this.setState({timeFilter: relativeTime === 'custom' ? [since, until] : relativeTime})
            }}
          />
        </div>

        <Table
          className="pd3t bordert dashed"
          loading={isFetchingLossPredictPredictions}
          bordered
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={lossPredictPredictionsWithIndex}
        />
      </div>
    );
  }
}

export default (()=>{
  let WithModel = withLossPredictModels(PredictHistory, props => ({modelId: props.params.modelId}))
  return withLossPredictPredictions(WithModel, props => ({ modelId: props.params.modelId }))
})()
