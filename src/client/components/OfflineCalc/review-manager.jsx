import React from 'react'
import Bread from '../Common/bread'
import {message, Table, Radio} from 'antd'
import {getUsers} from '../../actions'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {Link} from 'react-router'
import { reviewManagerSagaModelGenerator} from './saga-model-generators'
import HorizontalSplitHelper from '../Common/horizontal-split-helper'
import {OfflineCalcTargetTypeName, OfflineCalcVersionStatus, OfflineCalcTargetType, OfflineCalcVersionStatusName, OfflineCalcVersionReviewStrategy} from '../../../common/constants'
import Fetch from '../../common/fetch-final'
import moment from 'moment'
import _ from 'lodash'

let userSelf = window.sugo.user

const noNeedReview = [OfflineCalcVersionStatus.pass, OfflineCalcVersionStatus.noPass, OfflineCalcVersionStatus.deleted, OfflineCalcVersionStatus.cancel]

const namespace = 'offline-calc-review-manager'

let mapStateToProps = (state, ownProps) => {
  const reviewState = state[namespace] || {}
  const reviewerState = state['offline-calc-reviewer-list-for-review-manager'] || {}
  // const tagsListState = state['switch-group-panel'] || {}
  return {
    ...reviewState,
    ...reviewerState,
    // ...tagsListState,
    users: _.get(state, 'common.users', [])
  }
}



@connect(mapStateToProps)
@withRuntimeSagaModel([reviewManagerSagaModelGenerator(namespace)])
export default class OfflineCalcReviewManager extends React.Component {
  
  state = {
    filterByDsId: 'all',
    selectedTagId: '',
    reviewerComment: [],
    expand: [],
    page: 1,
    pageSize: 10
  }

  componentDidMount() {
    this.props.dispatch(getUsers())
  }

  handleExpand = (record) =>{
    let { expand } = this.state
    if(expand.includes(record.id)){
      expand = expand.splice(expand.indexOf(record.id)+1,1)
    }else{
      expand.push(record.id)
    }
    this.setState({
      expand
    })
  }

  async handleCancel(id) {
    let { success, message: msg } = await Fetch.post('/app/offline-calc/cancel-review', { id })
    if (!success) {
      return message.error(msg)
    }
    this.props.dispatch({
      type: 'offline-calc-review-manager/fetch'
    })
    message.success('取消成功')
    
  }

  expandedRowRender(record) {
    let { expand } = this.state
    let commentsArr = _.get(record, 'comments.reviewer', [])
    let { users } = this.props
    let columns = [
      {
        title: '审核人',
        key: 'user_id',
        dataIndex: 'id',
        render: (val) => {
          let user = users.find(o => o.id === val)
          return `${_.get(user,'first_name')}(${_.get(user,'username')})`
        }
      },{
        title: '审核结果',
        key: 'reviewResult',
        dataIndex: 'id',
        render: (val) =>  {
          if (record.status === OfflineCalcVersionStatus.watingForDel || record.status === OfflineCalcVersionStatus.deleted) {
            let del_status = record.review_status.del_status.map( i => i.user_id)
            return del_status.includes(val) ? '通过' : '待审核'
          }
          return OfflineCalcVersionStatusName[Object.keys(OfflineCalcVersionStatusName)[_.get(_.find(commentsArr, o => o.user_id === val), 'reviewResult', 1) - 1]]
        }
      },{
        title: '审核意见',
        key: 'comment',
        render: (val) => _.get(_.find(commentsArr, o => o.user_id === val.id), 'comment', '')
      },{
        title: '审核日期',
        key: 'comment_date',
        render: (val) => _.get(_.find(commentsArr, o => o.user_id === val.id), 'comment_date', '')
      }
    ].filter(_.identity)

    let ds = record.review_status.reviewer_list.list
    if (record.status === OfflineCalcVersionStatus.watingForDel || record.status === OfflineCalcVersionStatus.deleted) {
      ds = record.review_status.del_reviewer_list.list
      columns.splice(2,2)
    }
    return (
      <Table
        rowKey={(re) => re.id + expand.length}
        bordered
        columns={columns}
        dataSource={ds.map( i => ({id: i}))}
        pagination={false}
      />
    )
  }

  renderColumns() {
    let { users } = this.props
    // let userDict = _.keyBy(users, 'id')
    // let tagIdDict = _.keyBy(tags, 'id')
    // let dsIdDict = _.keyBy(offlineCalcDataSources, 'id')
    return [
      {
        title: '项目名称',
        dataIndex: 'target.name',
        key: 'name',
        render: (v, record) => _.get(record, 'target.name', '--')
      },
      {
        title: '所属项目',
        key: 'target_type',
        render: (val,record) => {
          let target_type = _.get(record,'target_type')
          let nameDict = {}
          for (let k in OfflineCalcTargetType) {
            nameDict[OfflineCalcTargetType[k]] = k
          }
          return  OfflineCalcTargetTypeName[nameDict[target_type]]
        }
      },
      {
        title: '审核状态',
        dataIndex: 'status',
        key: 'status',
        render: (val) => {
          return OfflineCalcVersionStatusName[Object.keys(OfflineCalcVersionStatusName)[val - 1]]
        }
      },
      {
        title: '版本',
        dataIndex: 'version',
        key: 'version'
      },
      {
        title: '提审人',
        dataIndex: 'created_by',
        key: 'created_by',
        render: (val) => {
          let user = users.find(o => o.id === val)
          return `${_.get(user,'first_name')}(${_.get(user,'username')})`
        }
      },
      {
        title: '处理时间',
        dataIndex: 'updated_at',
        key: 'updated_at',
        render: (val) => moment(val).format('YYYY-MM-DD HH:mm:ss')
      },
      {
        title: '查看审核意见',
        dataIndex: 'comments',
        key: 'comments',
        render: (val, record) => {
          return (
            <a
              className="color-blue"
              onClick={() => this.handleExpand(record)}
            > 
              查看
            </a>
          )
        }
      },
      {
        title: '审核操作',
        dataIndex: 'id',
        key: 'op',
        render: (val, record) => {
          let target_type = record.target_type + ''
          let status = record.status
          if (noNeedReview.includes(~~status)) return 

          let isReviewer = false
          let isDelReviewer = false
          let strategy = record.review_status.reviewer_list.strategy
          let reviewerList = record.review_status.reviewer_list.list
          let del_reviewer_list = _.get(record, 'review_status.del_reviewer_list.list')
          let del_strategy = _.get(record, 'review_status.del_reviewer_list.strategy')

          let selfSequence    //该审核员是第几审核员
          let nowReviewer
          if (strategy === OfflineCalcVersionReviewStrategy.oneByOne) {
            selfSequence = _.findIndex(reviewerList, o => o === userSelf.id)
            nowReviewer = (record.review_status.status || []).length - 1

            if (selfSequence === nowReviewer + 1) isReviewer = true
          }
          if (strategy === OfflineCalcVersionReviewStrategy.onePassAllPass) {

          }

          let selfDelSequence
          let nowDelReviewer
          if (del_strategy === OfflineCalcVersionReviewStrategy.oneByOne) {
            selfDelSequence = _.findIndex(del_reviewer_list, o => o === userSelf.id)
            nowDelReviewer = (record.review_status.del_status || []).length - 1
            if (selfDelSequence === nowDelReviewer + 1) isDelReviewer = true
          }
          if (del_strategy === OfflineCalcVersionReviewStrategy.onePassAllPass) {

          }

          let canPutReview = record.id !== record.belongs_id

          let isLancher = userSelf.id === record.created_by

          return (
            <React.Fragment>
              {
                isReviewer ?
                  <Link className="mg2r" to={
                    target_type === OfflineCalcTargetType.IndicesModel
                      ? `/console/offline-calc/models/${record.target_id}?targetType=${OfflineCalcTargetType.Reviewer}&versionId=${record.id}`
                      : `/console/offline-calc/release-version/${record.id}?targetType=${OfflineCalcTargetType.Reviewer}`
                  }
                  >审核</Link>
                  : null
              }
              {
                isDelReviewer ? 
                  <Link className="mg2r" to={
                    target_type !== OfflineCalcTargetType.IndicesModel 
                      ? `/console/offline-calc/release-version/${record.id}?targetType=${OfflineCalcTargetType.DelReviewer}`
                      : `/console/offline-calc/models/${record.target_id}?targetType=${OfflineCalcTargetType.DelReviewer}&versionId=${record.id}`
                  }
                  >审核删除</Link>
                  : null
              }
              {
                isLancher ?
                  <a
                    className="fpointer color-blue"
                    onClick={() => this.handleCancel(record.id)}
                  >
                  取消审核
                  </a>
                  : null
              }
            </React.Fragment>
          )
        }
      }
    ]
  }
  
  render() {
    const {offlineCalcReviewManager} = this.props
    const { selectedTagId, filterByDsId, page, pageSize } = this.state

    return (
      <React.Fragment>
        <Bread
          path={[
            { name: '审核管理' }
          ]}
        />
        <HorizontalSplitHelper
          style={{height: 'calc(100% - 44px)'}}
          className="contain-docs-analytic"
        >
          <div
            className="itblock height-100"
            style={{padding: '10px'}}
            defaultWeight={5}
          >
            <div className="pd3x pd2y bg-white corner height-100 overscroll-y">
              <div className="mg3b">
                <Radio.Group 
                  defaultValue={OfflineCalcVersionStatus.watingForReview} 
                  buttonStyle="solid"
                  onChange={(e) => this.props.dispatch({type: `${namespace}/fetch`, payload: { page, pageSize, status: e.target.value}})}
                >
                  <Radio.Button value={OfflineCalcVersionStatus.watingForReview}>待审核</Radio.Button>
                  <Radio.Button value={OfflineCalcVersionStatus.pass}>已审核</Radio.Button>
                  <Radio.Button value="all">全部</Radio.Button>
                </Radio.Group>
              </div>
              <div>
                <Table
                  rowKey="id"
                  bordered
                  defaultWeight={5}
                  expandIconAsCell={false} 
                  expandIconColumnIndex={-1}
                  expandedRowRender={(record) => this.expandedRowRender(record)}
                  expandedRowKeys={this.state.expand}
                  dataSource={offlineCalcReviewManager}
                  columns={this.renderColumns()}
                />
              </div>
            </div>
          </div>
        </HorizontalSplitHelper>
      </React.Fragment>
    )
  }
}
