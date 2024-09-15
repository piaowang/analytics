import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { Button, Checkbox, message, Popconfirm } from 'antd'
import React,{ useState } from 'react'
import { deleteApplication } from './store/queryhelper'
import _ from 'lodash'
import imgurl from './images/icon_add@2x.png'

export default function AppItem(props) {
  const {
    showModal,
    setApp,
    setCheckList,
    setModalState,
    checkList = [],
    isOrdering
  } = props

  const item = props?.app || {}

  const { dispatch } = window.store
  const [showCtr, setShowCtr] = useState(false)
  function renderAdd() {
    return (
      <div
        className="pointer"
        style={{
          textAlign: 'center',
          paddingTop: '40px',
          backgroundColor: '#F3F3F3',
          width: '228px',
          height: '170px',
          marginRight: '20px',
          marginBottom: '20px'
        }}
        onClick={() => {
          showModal('addApp')
        }}
      >
        <div>
          <img style={{ width: '52px', height: '52px' }} src={imgurl} />
        </div>
        <div style={{ fontSize: '14px' }} className="mg2t">
          添加更多应用
        </div>
      </div>
    )
  }

  if (item.type === 'add') return renderAdd()

  const handleDel = async (app) => {
    const res = await deleteApplication(app)
    if (!res) return message.error('删除失败')
    setCheckList(_.difference(checkList, [app.id]))
    message.success('删除成功')
    dispatch({
      type: 'application-management/initApplications'
    })
  }

  return (
    <div
      className="btn-group-parent"
      onMouseEnter={() => {
        setShowCtr(true)
      }}
      onMouseLeave={() => {
        setShowCtr(false)
      }}
      style={{
        backgroundColor: '#fff',
        boxShadow: '0 0 10px #aaa',
        width: '228px',
        height: '170px',
        position: 'relative',
        marginRight: '20px',
        marginBottom: '20px'
      }}
    >
      <div
        style={{
          height: '130px',
          borderRadius: '6px',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
        //点击应用 弹出标签选择弹窗
        // onClick={() => {
        //   if (!isOrdering) {
        //     setModalState('addTagModal')
        //     setApp(item)
        //   }
        // }}
      >
        {_.isEmpty(item.img) ? (
          <span>暂无缩略图</span>
        ) : (
          <img
            style={{ width: '100%', pointerEvents: 'none' }}
            alt="图片"
            src={item.img}
          />
        )}
      </div>
      <div
        className="aligncenter"
        id="application-item-checkbox"
        style={{
          lineHeight: '62px',
          height: '40px'
        }}
      >
        <Checkbox
          style={{
            width: '16px',
            height: '16px',
            verticalAlign: 'top',
            lineHeight: '16px',
            position: 'absolute',
            top: '10px',
            left: '10px'
          }}
          onChange={(e) => {
            if (e.target.checked) {
              setCheckList([...checkList, item.id])
            } else {
              setCheckList(_.difference(checkList, [item.id]))
            }
          }}
          checked={_.includes(checkList, item.id)}
        />
        <div
          className="elli itblock"
          style={{
            width: '100%',
            padding:'0 10px',
            lineHeight: '40px',
            textAlign: 'left'
          }}
          title={item.name}
        >
          {item.name}
        </div>
        <div
          className="btn-grop item-grop-box"
          
          style={{
            display: showCtr ? 'block' : 'none'
          }}
        >
          <Button
            icon={<EditOutlined />}
            style={{
              width: '62px',
              height: '24px',
              fontSize: '12px',
              color: '#6969D7',
              borderRadius: '4px',
              padding: '4px 8px',
              lineHeight: '16px',
              position: 'absolute',
              bottom: '48px',
              right: '48px'
            }}
            onClick={() => {
              showModal('editApp')
              setApp(item)
            }}
          >
            编辑
          </Button>
          <Popconfirm
            placement="topLeft"
            title="您确定删除吗?"
            onConfirm={() => {
              handleDel(item)
            }}
            okText="确定"
            cancelText="取消"
          >
            <Button
              icon={<DeleteOutlined />}
              style={{
                fontSize: '12px', padding: '4px', height: '24px', width: '24px',
                borderRadius: '50%', lineHeight: '12px', position: 'absolute',
                color: 'red',bottom: '48px',right: '9px'
              }}
            />
          </Popconfirm>
        </div>
      </div>
    </div>
  )
}
