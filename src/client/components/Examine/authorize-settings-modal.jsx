import _ from 'lodash'
import React from 'react'
import PropTypes from 'prop-types'
import {connect} from 'react-redux'
import withRuntimeSagaModel from '../Common/runtime-saga-helper'
import Fetch from '../../common/fetch-final'
import { Form } from '@ant-design/compatible';
import '@ant-design/compatible/assets/index.css';
import { Select, Modal, Row, Col, Tree, Tag } from 'antd';
const { TreeNode } = Tree

const namespace = 'authorizeSettingsModal'

const formItemLayout = {
  labelCol: { span: 4 },
  wrapperCol: { span: 20 }
}

let mapStateToProps = props => {
  return {
    ...props[namespace]
  }
}
const sagaModelGenerator = props => {
  return {
    namespace: `${namespace}`,
    state: {
      institutions: [],
      userList: [],
      categoryList: [],
      selectedCategoryId: '',
      deleteCategoryModal: ''
    },
    reducers: {
      setInstitutions(state, { payload }) {
        return {
          ...state,
          ...payload
        }
      },
      setUserList(state, { payload }) {
        return {
          ...state,
          ...payload
        }
      }
    },
    sagas: {
      *getInstitutions({ payload }, { call, select, put }) {
        let url = '/app/institutions/tree-data'
        let res = yield call(Fetch.get, url, null)
        if (res && res.success) {
          yield put({
            type: 'setInstitutions',
            payload: {
              institutions: res.result.data || []
            }
          })
        } else {
          console.error('获取部门信息失败!')
        }
      },

      *getUserList({ payload }, { call, select, put }) {
        let url = '/app/user/get'
        let res = yield call(Fetch.get, url, null)
        if (res && res.result) {
          yield put({
            type: 'setUserList',
            payload: {
              userList: res.result || []
            }
          })
        } else {
          console.error('获取部门信息失败!')
        }
      },
  
      *authorizeSet({ payload }, { call, select, put }) {
        const {data, callback} = payload
        let url = '/app/examine/authorize-to'
        let res = yield call(Fetch.post, url, { ...data })
        if (res && res.success) {
          typeof callback === 'function' && callback(res.result)
          return
        } else {
          console.error('操作失败')
        }
        typeof callback === 'function' && callback()
      }
    },
    subscriptions: {
      init({ dispatch }) {
        dispatch({ type: 'getInstitutions', payload: {} })
        dispatch({ type: 'getUserList', payload: {} })
      }
    }
  }
}

@Form.create()
@withRuntimeSagaModel(sagaModelGenerator)
@connect(mapStateToProps)
export default class AuthorizeSettingsModal extends React.Component {
  
  static propTypes = {
    children: PropTypes.oneOfType([PropTypes.node, PropTypes.func]).isRequired,
    title: PropTypes.string,
    institutions: PropTypes.array,
    userList: PropTypes.array
  }
  
  state = {
    showModal: false,
    confirmLoading: false,
    list: [],
    selectUser: []
  }

  // componentWillReceiveProps (nextProps) {
  //   const {authorizeTo=[], userList=[] } = this.props
  //   const {userList: nextUserList=[], authorizeTo: nextAuthorizeTo=[]} = nextProps
  //   if (_.difference(nextUserList, userList).length || _.difference(nextAuthorizeTo, authorizeTo).length) {
  //     const selectUList = nextUserList.filter(({id}) => nextAuthorizeTo.includes(id))
  //     const selectUser = selectUList.map(({id, first_name}) => ({id, value: first_name}))
  //     this.setState({selectUser})
  //   }
  // }

  componentDidUpdate(prevProps) {
    const {authorizeTo=[], userList=[] } = this.props
    const {authorizeTo: prevAuthorizeTo=[], userList: prevUserList=[]} = prevProps

    if ((_.difference(prevAuthorizeTo, authorizeTo).length
     || _.difference(authorizeTo, prevAuthorizeTo).length
     || _.difference(userList, prevUserList).length
    ) && userList.length) {
      const selectUList = userList.filter(({id}) => authorizeTo.includes(id))
      const selectUser = selectUList.map(({id, first_name}) => ({id, value: first_name}))
      this.setState({selectUser})
    }
  }

  initTreeData = (rows=[], key=null, nodedata=[]) => {
    const data = rows.filter(({parent}) => parent === key)
    const treeNodes = data.map(({ name, id, serialNumber, parent, roleIds }) => ({ value: id, title: name, name, id, key: id, serialNumber, parent, roleIds, children: [] }))
    nodedata.push(...treeNodes)
    if (nodedata.length) {
      for(let i=0; i<nodedata.length; i+=1) {
        const {key , children} = nodedata[i]
        this.initTreeData(rows, key, children)
      }
    }
  }

  renderTreeNodes = (data) => data.map((item) => {
    return item.children.length
      ? (
        <TreeNode
          level={item.level}
          title={`${item.name}`}
          key={`${item.key}`}
        >
          {item.children && this.renderTreeNodes(item.children)}
        </TreeNode>
      )
      : (
        <TreeNode
          level={item.level}
          title={`${item.name}`}
          key={`${item.key}`}
        />
      )
  })

  changeInstitutions = ([id]) => {
    const {userList} = this.props
    const list = userList.filter(({institutions_id}) => id === institutions_id)
    this.setState({list})
  }

  onSelect = (first_name, id) => {
    const {form: {setFieldsValue}} = this.props
    const {selectUser} = this.state

    const select = _.uniqBy([...selectUser, {value: first_name, id}], 'id')

    this.setState({selectUser: select}, () => {
      setFieldsValue({user_id: _.map( select, (user)=>user.value )})
    })
  }

  changeSelect = (value) =>{
    const {selectUser} = this.state
    const select = _.filter(selectUser, user => value.includes(user.value) )
    this.setState({selectUser: select})
  }

  submit = () => {
    const {setAuthorizeTo, screenId: live_screen_id, form: {validateFields, setFieldsValue}, dispatch } = this.props 
    const {selectUser} = this.state

    validateFields((err) => {
      const select = _.map(selectUser, user => user.id)
      if (err || !select.length) { return }
      this.setState({confirmLoading: true})
      dispatch({
        type: `${namespace}/authorizeSet`,
        payload: {
          data: {
            user_ids: select,
            live_screen_id
          },
          callback: (authorizeTo) => {
            this.setState({confirmLoading: false, showModal: false, selectUser: []})
            if(!authorizeTo) {
              setFieldsValue({user_id: authorizeTo})
            }
            typeof setAuthorizeTo === 'function' && setAuthorizeTo(authorizeTo)
          }
        }
      })
    })
  }
  
  renderModal() {
    let { form: { getFieldDecorator }, institutions = [], getContainer } = this.props

    const {list, selectUser} = this.state
    const treeData = []
    this.initTreeData(institutions, '', treeData)
    const defaultExpandedKeys = _.reduce(treeData, (r, v) => {
      r.push(v.key)
      r = _.concat(r, _.get(v, 'children', []).map(p => p.key))
      return r
    }, [])

    let { showModal, confirmLoading } = this.state
  
    return (
      <Modal
        visible={showModal}
        onCancel={this.toggleModalVisible}
        onOk={this.submit}
        title="授权给某人"
        confirmLoading={confirmLoading}
        closable
        maskClosable={false}
        width={450}
        getContainer={ getContainer || (() => document.body)}
      >
        <Form>
          <Form.Item
            label="授权给"
            {...formItemLayout}
          >
            {getFieldDecorator('user_id', {
              initialValue: selectUser.map(({value}) => value),
              rules: [{
                required: true,
                message: '必须选择一个人进行授权'
              }]
            })(<Select
              mode="multiple"
              dropdownStyle={{display: 'none'}}
              onChange={this.changeSelect}
            />)}
          </Form.Item>
          <Row gutter={2}>
            <Col className="gutter-row" span={12}>
              {
                treeData.length
                  ? <Tree
                    defaultExpandedKeys={defaultExpandedKeys}
                    onSelect={this.changeInstitutions}
                  >
                    {this.renderTreeNodes(treeData)}
                  </Tree >
                  : null
              }
            </Col>
            <Col className="gutter-row" span={12}>
              {list.map(({first_name, id}) => {
                return (
                  <div key={id} style={{margin: '5px 0'}}>
                    <Tag color="blue" key={id} onClick={() => this.onSelect(first_name, id)}>{first_name}</Tag>
                  </div>)
              })}
            </Col>
          </Row>
        </Form>
      </Modal>
    )
  }
  
  toggleModalVisible = () => {
    this.setState(prevState => ({
      showModal: !prevState.showModal
    }))
  }
  
  render() {
    let {children} = this.props
    return (
      <React.Fragment>
        {this.renderModal()}
        <span onClick={this.toggleModalVisible}>
          {children}
        </span>
      </React.Fragment>
    )
  }
}
