import React from 'react'
import { Button, Input, Select } from 'antd'
import { DndProvider, useDrag, useDrop, Table } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import update from 'immutability-helper'
import _ from 'lodash'
import FixWidthHelper from '../../Common/fix-width-helper-no-hidden'
import SmallImagePicker from '../../LiveScreen/small-img-picker'
import { enableSelectSearch } from '../../../common/antd-freq-use-props'
import { immutateUpdate, insert } from '../../../../common/sugo-utils'
import {
  CloseCircleOutlined,
  CloseOutlined,
  PlusOutlined,
  UploadOutlined
} from '@ant-design/icons'

export default class AppGroups extends React.Component {
  constructor(props){
    super(props)
  }
  componentWillReceiveProps(props){
    if(props.value){
      this.setData(props.value)
    }
  }
  setData(val){
    this.setState({
      data:val
    })
  }
  moveRow = (dragIndex, hoverIndex,index) => {
    const { data } = this.state
    const dragRow = data[index].apps[dragIndex]
    console.log('AppGroups -> moveRow -> dragIndex, hoverIndex', dragIndex, hoverIndex)
    // this.setState(
    //   update(this.state, {
    //     data: {
    //       $splice: [
    //         [dragIndex, 1],
    //         [hoverIndex, 0, dragRow]
    //       ]
    //     }
    //   })
    // )
  }
  DragableBodyRow = ({ index, moveRow, className, style, ...restProps }) => {
    const ref = React.useRef()
    const [{ isOver, dropClassName }, drop] = useDrop({
      accept: 'DragableBodyRow',
      collect: monitor => {
        const { index: dragIndex } = monitor.getItem() || {}
        if (dragIndex === index) {
          return {}
        }
        return {
          isOver: monitor.isOver(),
          dropClassName: dragIndex < index ? ' drop-over-downward' : ' drop-over-upward'
        }
      },
      drop: item => {
        moveRow(item.index, index)
      }
    })
    const [, drag] = useDrag({
      item: {type:'DragableBodyRow' , index },
      collect: monitor => ({
        isDragging: monitor.isDragging()
      })
    })
    drop(drag(ref))
    return (
      <tr
        ref={ref}
        className={`${className}${isOver ? dropClassName : ''}`}
        style={{ cursor: 'move', ...style }}
        {...restProps}
      />
    )
  }
  components = {
    body: {
      row: this.DragableBodyRow
    }
  }
  render(){
    const { value, onChange = _.noop, applications = [] } = this.props
    if(!value) return null
    console.log('AppGroups -> render -> this.props', this.props)
    if(!value  || !value.length){
      return (
        <a
          href="#"
          onClick={ev => {
            ev.preventDefault()
            onChange([...(value || []), { name: '', apps: [{}] }])
          }}
        >
          <PlusOutlined />
          新增应用分组
        </a>
      )
    } 
    
    return (
      <div>
        {_.map(this.state.data, (g, gi) => {
          const columns = [
            {
              title: '选择应用',
              dataIndex: '',
              key: gi,
              render(app, ai) {
                return (
                  <Select
                    {...enableSelectSearch}
                    value={app.id || ''}
                    onChange={value => {
                      onChange(
                        immutateUpdate(
                          value,
                          [gi, 'apps', ai, 'id'],
                          () => value
                        )
                      )
                    }}
                  >
                    {_.map(applications, app => {
                      return (
                        <Select.Option key={app.id}>
                          {app.name}
                        </Select.Option>
                      )
                    })}
                  </Select>
                )
              }
            },
            {
              title: '显示名称',
              dataIndex: '',
              key: gi,
              render(app, ai) {
                return (
                  <Input
                    placeholder="使用原名称"
                    value={app.title || ''}
                    onChange={ev => {
                      const { value } = ev.target
                      onChange(
                        immutateUpdate(
                          value,
                          [gi, 'apps', ai, 'title'],
                          () => value
                        )
                      )
                    }}
                  />
                )
              }
            },
            {
              title: '静默状态 logo',
              dataIndex: '',
              key: gi,
              render(app, ai){
                return(
                  <SmallImagePicker
                    className="itblock"
                    imgStyle={{ maxHeight: '32px' }}
                    value={app.logo || ''}
                    onChange={imgUrl => {
                      onChange(
                        immutateUpdate(
                          value,
                          [gi, 'apps', ai, 'logo'],
                          () => imgUrl
                        )
                      )
                    }}
                  >
                    <Button>
                      <UploadOutlined /> 上传
                    </Button>
                  </SmallImagePicker>
                )
              }
            },
            {
              title: '悬浮状态 logo',
              dataIndex: '',
              key: gi,
              render(app, ai){
                return(
                  <SmallImagePicker
                    imgStyle={{ maxHeight: '32px' }}
                    value={app.hoverLogo || ''}
                    onChange={imgUrl => {
                      onChange(
                        immutateUpdate(
                          value,
                          [gi, 'apps', ai, 'hoverLogo'],
                          () => imgUrl
                        )
                      )
                    }}
                  >
                    <Button>
                      <UploadOutlined /> 上传
                    </Button>
                  </SmallImagePicker>
                )
              }
            },
            {
              title: '',
              dataIndex: '',
              key: gi,
              render(ai) {
                return(
                  <div className="sdsds">
                    <PlusOutlined
                      className="line-height32 pointer color-main"
                      onClick={() => {
                        onChange(
                          immutateUpdate(value, [gi, 'apps'], apps =>
                            insert(apps, ai, {})
                          )
                        )
                      }}
                    />
                    <CloseOutlined
                      className="mg2l line-height32 pointer color-red"
                      onClick={() => {
                        onChange(
                          immutateUpdate(value, [gi, 'apps'], apps =>
                            apps.filter((a, j) => j !== ai)
                          )
                        )
                      }}
                    />
                  </div>
                )
              }
            }
          ]
          return (
            <div
              key={gi}
              className="pd2 mg2b relative hover-display-trigger"
              style={{
                background: 'rgba(249,249,249,1)',
                border: '1px dashed #d9d9d9',
                borderRadius: '4px'
              }}
            >
              <CloseCircleOutlined
                className="absolute pointer color-red hover-display-iblock"
                style={{
                  top: '0px',
                  right: '0px',
                  transform: 'translate(50%, -50%)',
                  fontSize: '18px'
                }}
                onClick={() => {
                  onChange(value.filter((a, j) => j !== gi))
                }}
              />
              <FixWidthHelper
                toFix="first"
                // wrapperStyle = {{minWidth:'400px'}}
                toFixWidth={null}
                className="mg2b"
              >
                <div className="line-height32">应用分组名称：</div>
                <Input
                // className="width300"
                  value={g.name}
                  onChange={ev => {
                    const { value } = ev.target
                    onChange(
                      immutateUpdate(value, [gi, 'name'], () => value)
                    )
                  }}
                />
              </FixWidthHelper>
              <DndProvider backend={HTML5Backend}>
                <Table
                  columns={{...columns}}
                  dataSource={g.apps || []}
                  components={{...this.components}}
                  onRow={(record, index) => ({
                    index,
                    moveRow: (dragIndex, hoverIndex)=> this.moveRow(dragIndex, hoverIndex,g)
                  })}
                />
              </DndProvider>
              <a
                href="#"
                onClick={ev => {
                  ev.preventDefault()
                  onChange(
                    immutateUpdate(value, [gi, 'apps'], apps => [
                      ...(apps || []),
                      {}
                    ])
                  )
                }}
              >
                <PlusOutlined />
              新增一个应用
              </a>
            </div>
          )
        })}
        <a
          href="#"
          onClick={ev => {
            ev.preventDefault()
            onChange([...(value || []), { name: '', apps: [{}] }])
          }}
        >
          <PlusOutlined />
        新增应用分组
        </a>
      </div>
    )
  }
  
}
