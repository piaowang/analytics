import React, { PureComponent } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import Fetch from '../../common/fetch-final'
import Bread from '../Common/bread'
import SearchComponent from './search'
import TableComponent from './table'
import './data-checking.styl'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import * as actions from '../../../client/actions'

const namespace = 'auditPage'

const auditPageSagaModel = props => {
  let saga = {
    namespace,
    state: {
      isFetching: true,
      pageSize: 30,
      page: 1,
      type: '',
      status: '',
      keyWord: '',
      total: 0,
      listData: [],
      targetCheck: null
    },
    reducers: {
      updateState (state, { payload: updater }) {
        return updater(state)
      }
    },
    sagas: {
      * getList ({ }, { call, put, select }) {
        yield put({
          type: 'updateState',
          payload: prevState => ({
            ...prevState,
            isFetching: false
          })
        })
        const data = yield select(state => state[namespace])
        let { pageSize, page, type, status, keyWord } = data
        let remoteData = yield call(Fetch.get, '/app/data-checking/list',
          { pageSize, page, type: parseInt(type), status: parseInt(status), keyWord }
        )
        const auditList = _.get(remoteData, 'result.rows')
        const total = _.get(remoteData, 'result.count')
        yield put({
          type: 'updateState',
          payload: prevState => ({
            ...prevState,
            listData: auditList,
            total,
            isFetching: false
          })
        })
      },
      * changeQuery ({ payload: { data } }, { call, put, select }) {
        yield put({
          type: 'updateState',
          payload: prevState => ({
            ...prevState,
            ...data,
          })
        })
        yield call(saga.sagas.getList, {}, { call, put, select })
      },

      * changeState ({ payload: { data } }, { call, put, select }) {
        yield put({
          type: 'updateState',
          payload: prevState => ({
            ...prevState,
            ...data,
          })
        })
      }
    },
    subscriptions: {
      setup ({ dispatch, history }) {
        dispatch({ type: 'getList' })
        return () => {

        }
      }
    }
  }
  return (saga)
}


let mapStateToProps = (state, ownProps) => {
  let runtimeNamespace = namespace
  const dashboardViewerModelState = state[runtimeNamespace] || {}
  return {
    ...dashboardViewerModelState,
    ...state.common,
    runtimeNamespace
  }
}

let mapDispatchToProps = (dispatch) => {
  return {
    getList: (payload) => dispatch({
      type: `${namespace}/getList`,
      payload
    }),
    changeQuery: (payload) => {
      dispatch({
        type: `${namespace}/changeQuery`,
        payload
      })
    },
    changeState: (payload) => {
      dispatch({
        type: `${namespace}/changeState`,
        payload
      })
    },
    setTargetCheck: (payload) => {
      let { data } = payload
      dispatch({
        type: `set_targetCheck`,
        data
      })
    },
    getUsers: bindActionCreators(actions.getUsers, dispatch),
    getInstitutions: bindActionCreators(actions.getInstitutions, dispatch),
    getDatasources: bindActionCreators(actions.getDatasources, dispatch),
    getResForAudit: bindActionCreators(actions.getResForAudit, dispatch),
    getPermissions: bindActionCreators(actions.getPermissions, dispatch)
  }
}


@connect(mapStateToProps, mapDispatchToProps)
@withRuntimeSagaModel(auditPageSagaModel)
export default class DataChecking extends PureComponent {
  componentDidMount () {
    this.props.getUsers()
    this.props.getInstitutions()
    this.props.getDatasources()
    this.props.getResForAudit()
    this.props.getPermissions()
  }
  render () {
    return (
      <div className="height-100 bg-white">
        <Bread
          path={[
            { name: '数据审核' }
          ]}
        />
        <div className="scroll-content pd2y pd3x">
          <SearchComponent {...this.props} />
          <TableComponent {...this.props} />
        </div>
      </div>
    )
  }
}
