import React, { Component } from 'react'
import { Button,Table } from 'antd'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import {browserHistory} from 'react-router'
import './index.styl'
import _ from 'lodash'
import * as actions from '../../../client/actions'
import { bindActionCreators } from 'redux'




const ComparePageSagaModel = () => {
  return ({
    namespace: 'comparePage',
    state: {
      isFetching: true
    },
    reducers: {
      updateState(state, {payload: updater}) {
        return updater(state)
      }
    },
    sagas: {
      *updateState({payload},effects){
        alert('in')
        yield effects.put({
          type: 'updateState',
          payload
        })
      }
    },
    subscriptions: {

    }
  })
}


let mapStateToProps = (state) => {
  let runtimeNamespace = 'comparePage'
  const dashboardViewerModelState = state[runtimeNamespace] || {}
  return {
    ...dashboardViewerModelState,
    ...state.common,
    runtimeNamespace
  }
}

let mapDispatchToProps = (dispatch) =>{
  return {
    getUsers:bindActionCreators(actions.getUsers,dispatch),
    getInstitutions:bindActionCreators(actions.getInstitutions,dispatch),
    setCompareInfo:bindActionCreators(actions.setCompareInfo,dispatch),
    findOneUserDraft:bindActionCreators(actions.findOneUserDraft,dispatch),
    getRoles:bindActionCreators(actions.getRoles,dispatch)
  }
}


@connect(mapStateToProps,mapDispatchToProps)
@withRuntimeSagaModel(ComparePageSagaModel)

class CompatePage extends Component {

  componentDidMount(){
    let { compareInfo,location } = this.props
    let id = _.get(location,'query.id')
    if(_.isEmpty(compareInfo)){
      this.props.getUsers({},()=>{
        this.props.getRoles({},true,()=>{
          this.props.getInstitutions({},()=>{
            this.props.findOneUserDraft({id},(res)=>{
              let { result } = res
              this.props.setCompareInfo(result)
            })
          })
        })
      })
    }
  }

  render(){
    let { compareInfo,location } = this.props
    let locationFrom = _.get(location,'query.from')
    let columns = _.get(compareInfo,'columns',[])
    let draft = _.get(compareInfo,'dataSource.draft',[])
    let regular = _.get(compareInfo,'dataSource.regular',[])
    return (
      <div className="compare-page">
        <div className="compare-page-header relative">
          <Button className="back-btn" onClick={()=>{
            // browserHistory.goBack()
            browserHistory.push(locationFrom)
          }}
          >
            返回
          </Button>
          <div className="compare-page-header-title">{ this.props.title || '对比页面' }</div>
        </div>
        <div className="compare-page-content">
          <div className="compare-page-table-wraper">
            <h3>当前信息</h3>
            <Table style={{width:'100%'}} size="small" columns={columns} dataSource={draft} pagination={false} bordered  />
          </div>
          <div className="compare-page-table-wraper">
            <h3>正式信息</h3>
            <Table 
              style={{width:'100%'}} 
              size="small" 
              columns={columns} 
              dataSource={_.get(regular.find(i=>i.title==='用户名'),'value')?regular:[]} pagination={false} bordered 
            />
          </div>
        </div>
      </div>
    )
  }
}
export default CompatePage

