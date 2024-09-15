import React, {useState, useEffect, useRef } from 'react'
import { Form } from '@ant-design/compatible'
import '@ant-design/compatible/assets/index.css'
import { Modal, Input, Select, Table, Button, Popconfirm, message, Tooltip } from 'antd'
import { connect } from 'react-redux'
import { namespace } from './model'
import renderFormItem, {illegalCharacter } from '../../../common/create-form-item'
import _ from 'lodash'
import shortid from 'shortid'
import deleteBtn from '../../../common/common-delete-btn'
import cleanBtn from './clean-btn'
import DragSortingTable from './drag-table'

const nodeIniInfo = () => ({
  name: '', id: shortid(), handlerId: '', handlerName: ''
})

function ConfigModal(props) {
  const { examineId, isShowConfigModal, configModalInfo, dispatch,
    form: { getFieldDecorator, validateFields, setFieldsValue },
    institutionList, roleList, onRefresh, takedIds } = props

  const [nodeList, setNodeList] = useState(_.get(configModalInfo, 'info', [nodeIniInfo()]))
  const [treeData, setTreeData] = useState(disableInstitution(institutionList))
  const [institutionId,setInstitutionId] = useState('')

  // 存审核人
  const [auditors,setAuditors] = useState({})
  // 存编辑状态
  const [curEdit,setCurEdit] = useState()
    
  // useEffect(() => {
  //   dispatch({
  //     type: `${namespace}/getExamineConfigByExamineId`,
  //     payload: {examineId }
  //   })
  // }, [examineId])

  useEffect(() => {
    setTreeData(disableInstitution(institutionList))
  }, configModalInfo)

  useEffect(() => {
    if( _.get(configModalInfo, 'institution_id', '') ) {
      dispatch({
        type: `${namespace}/getMembersByInstitutionsId`,
        payload: {institutions_id: configModalInfo.institution_id},
        callback: () => setNodeList(_.get(configModalInfo, 'info', [nodeIniInfo()]))
      })
    }
  }, [configModalInfo])

  /**
   * 根据 institution_id 查询 institutionList/children 的记录
   * （原来逻辑是只查找 institutionList 这层，并没有查找下面的 children : ）
   */
  function getInsIdInList(institutionList, id) {
    let targetList = {}
    for (let item of institutionList) {
      if (item.id === id) {
        targetList = item
      }
      if (targetList?.id) {
        break
      }
      if (_.isArray(item.children) && !!item.children.length) {
        targetList = getInsIdInList(item.children, id)
      }
    }
    return targetList
  }
  
  const columns = () => ([
    {
      title: '审批顺序',
      dataIndex: '',
      width: 80,
      render: (t, r, i) => i+1
    }, {
      title: '节点名称',
      dataIndex: '',
      render: (t, r, i) => {
        return (
          <Input
            placeholder="请输入数字、字母或中文"
            style={{ width: 300 }}
            onChange={(e) => onChangeNodeName(e, i)} 
            value={_.get(r, 'name', '')} 
            onFocus={()=>setCurEdit(i)}
            onBlur={()=>setCurEdit()}
          />
        )
      }
    }, {
      title: '审核人',
      dataIndex: '',
      render: (t, r, i) => {
        const ids = nodeList.map(o => o.handlerId)
        return (
          <Select style={{width: 200}} 
            getPopupContainer={triggerNode => triggerNode.parentNode}
            onSelect={(v) => onSelectRole(v, i)} defaultValue={_.get(r, 'handlerName', '')}
          >
            {roleList.map(o => {
              let hasInAuditors = false
              for(let auditor in auditors){
                if(auditor[1] === o.id){
                  hasInAuditors = true
                }
              }
              return (<Select.Option key={o.id} value={o.id} disabled={ids.includes(o.id)||hasInAuditors} >{o.first_name}</Select.Option>)
            })}
          </Select>
        )
      }
    }, {
      title: '操作',
      dataIndex: '',
      render: (t, r, i) => {
        if(nodeList.length === 1){
          return cleanBtn({
            onClick: () => onDeleteNode(i),
            title: '确定清除该审核流节点吗？'
          })
        }
        return  deleteBtn({
          onClick: () => onDeleteNode(i),
          title: '确定删除该审核流节点吗？'
        })
      }
    }
  ])
  let institution = getInsIdInList(institutionList, _.get(configModalInfo, 'institution_id', ''))
  const options = [
    {
      type: 'input',
      id: 'name',
      label: '审核流名称',
      checker: {
        initialValue: _.get(configModalInfo, 'name', ''),
        rules: [
          {required: true, message: '审核流名称最多不超过128个字符', max: 128 },
          illegalCharacter
        ]
      },
      options: {
        style: { width: 350 }
      }
    },   
    {
      type: 'textarea',
      id: 'desc',
      label: '审核流描述',
      checker: {
        initialValue: _.get(configModalInfo, 'desc', ''),
        rules: [
          {max: 255 }
        ]
      },
      options: {
        style: { width: 350 }
      }
    }, 
    {
      type: 'tree-select',
      id: 'institution_id',
      label: '审核流机构',
      checker: {
        initialValue: institution?.id,
        rules: [
          {required: true, message: '请选择所属机构'}
        ]
      },
      renderAfter: () => (<div>注： 一个机构下只能有一个正在使用的审批流</div>),
      options: {
        treeData: treeData,
        onSelect: (id) => onSelectInstitution(id),
        style: { width: 350 }
      }
    }
  ]

  function disableInstitution(institutionList) {
    const ids = _.isEmpty(configModalInfo) ? takedIds : takedIds.filter(o => o !== configModalInfo.institution_id)
    function disable(data){
      data.forEach(o => {
        if(ids.includes(o.id)) {
          o.disabled = true
        } else {
          o.disable = false
        }
        if(o.children.length) disable(o.children)
      })
    }
    disable(institutionList)
    return institutionList
  }

  function onChangeNodeName(e, i) {
    e && e.stopPropagation()
    const value =  _.get(e, 'target.value', '')
    // const pattern =  new RegExp(/^[\u4e00-\u9fa5a-zA-Z0-9]+$/g)
    let nodeListNew = _.cloneDeep(nodeList)
    if (!value) {
      _.set(nodeListNew[i], 'name', value)
      setNodeList(nodeListNew)
      return
    }
    // if(!pattern.test(value)){
    //   return  message.error('节点名称只能是数字、字母和中文组成!')
    // }
    _.set(nodeListNew[i], 'name', value)
    setNodeList(nodeListNew)
  }

  const onSelectRole = (v, i) => {
    setAuditors({
      ...auditors,
      [i]:v
    })
    const role = roleList.find(o => o.id === v) || {}
    _.set(nodeList[i], 'handlerId', v)
    _.set(nodeList[i], 'handlerName', role.first_name || '')
    setNodeList(nodeList)
  }

  function changeState(payload) {
    dispatch({
      type: `${namespace}/changeState`,
      payload
    })
  }

  function onAddNode() {
    if(!checkNode()) return message.warn('请先完善已添加节点')
    const array = _.cloneDeep(nodeList)
    array.push(nodeIniInfo())
    setNodeList(array)
  }

  function onDeleteNode(i) {
    const cloneList = _.cloneDeep(nodeList)
    _.pullAt(cloneList, i)
    setNodeList(cloneList.length? cloneList: [nodeIniInfo()])
  }

  function checkNode() {
    return !nodeList.some( o => !o.name || !o.handlerId ) && nodeList.length
  }

  const onSelectInstitution = (id) => {
    setInstitutionId(id)
    dispatch({
      type: `${namespace}/getMembersByInstitutionsId`,
      payload: {institutions_id: id}
    })
    if(id === _.get(configModalInfo, 'institution_id', '')) return setNodeList(configModalInfo.info || [nodeIniInfo()] )
    setNodeList([nodeIniInfo()])
  }

  const onSubmit = () => {
    validateFields((err, value) => {
      if (err) return
      if (!checkNode()) return message.warn('请先完善节点信息')
      const params = { ...value, nodeList }
      if (institutionId) {
        params.institution_id = institutionId
      }
      if (examineId) _.set(params, 'id', examineId)
      dispatch({
        type: `${namespace}/saveExamineConfig`,
        payload: params,
        callback: () => onRefresh()
      })
    })
  }
  
  function renderNodeConfig() {
    return (
      <React.Fragment>
        <div className="font14 mg2b">自定义审核流</div>
        <DragSortingTable
          dataSource={nodeList}
          columns={columns()}
          pagination={false}
          rowKey="id"
          changeDataSource={(arr) => setNodeList(arr)}
          curEdit={curEdit}
        />
      </React.Fragment>
    )
  }

  return (
    <Modal
      title={'配置审核流'}
      maskClosable={false}
      visible={isShowConfigModal}
      onOk={() => onSubmit()}
      width={800}
      onCancel={() => changeState({ isShowConfigModal: false })}
      bodyStyle={{minWidth:'800px'}}
    >
      <Form>
        { renderFormItem(options, getFieldDecorator)}
        {renderNodeConfig()}
      </Form> 
      <Button className="mg2t" type="primary" onClick={() => onAddNode()}> + 新增审核流程节点</Button>
    </Modal>
  )
}

export default connect(props => ({...props[namespace]}))(Form.create({})(ConfigModal))
