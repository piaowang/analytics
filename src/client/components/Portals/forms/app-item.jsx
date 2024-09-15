import React from 'react'
import { Tree, Col, Row ,Button,Input,Select} from 'antd'
import { enableSelectSearch } from '../../../common/antd-freq-use-props'
import { immutateUpdate, insert } from '../../../../common/sugo-utils'
import FixWidthHelper from '../../Common/fix-width-helper-no-hidden'
import {
  CloseCircleOutlined,
  UploadOutlined,
  CloseOutlined,
  PlusOutlined
} from '@ant-design/icons'
import SmallImagePicker from '../../LiveScreen/small-img-picker'
import _ from 'lodash'
import '../css/index.styl'

class AppItem extends React.Component {
  state = {
    data:[],
    expandedKeys: []
  };

  componentWillReceiveProps(props) {
    console.log('AppItem -> componentWillReceiveProps -> props', props)
    if (props.value?.length) {
      this.setData(props)
    }
  }
  setData(props) {
    const arr = []
    let val = JSON.parse(JSON.stringify(props.value))
    val.map((i,index)=>{
      if (i?.apps.length) {
        i.children = i.apps.map((k, ind) => {
          k.tit = k.title
          k.title = (
            <div className="item">
              <Row gutter={8} className="mg1b">
                <Col span={7}>选择应用</Col>
                <Col span={7}>显示名称</Col>
                <Col span={4}>静默状态 logo</Col>
                <Col span={4}>悬浮状态 logo</Col>
                <Col span={2} />
              </Row>
              <Row gutter={8} className="mg1b">
                <Col span={7}>
                  <Select
                    {...enableSelectSearch}
                    value={k.id || ''}
                    onChange={value => {
                      props.onChange(
                        immutateUpdate(
                          props.value,
                          [index, 'apps', ind, 'id'],
                          () => value
                        )
                      )
                    }}
                  >
                    {_.map(props.applications, app => {
                      return (
                        <Select.Option key={app.id}>{app.name}</Select.Option>
                      )
                    })}
                  </Select>
                </Col>
                <Col span={7}>
                  <Input
                    placeholder="使用原名称"
                    value={k.tit}
                    onChange={(ev) => {
                      const { value } = ev.target
                      props.onChange(
                        immutateUpdate(
                          props.value,
                          [index, 'apps', ind, 'title'],
                          () => value
                        )
                      )
                    }}
                  />
                </Col>
                <Col span={4}>
                  <SmallImagePicker
                    className="itblock"
                    imgStyle={{ maxHeight: '32px' }}
                    value={k.logo || ''}
                    onChange={imgUrl => {
                      props.onChange(
                        immutateUpdate(
                          props.value,
                          [index, 'apps', ind, 'logo'],
                          () => imgUrl
                        )
                      )
                    }}
                  >
                    <Button>
                      <UploadOutlined /> 上传
                    </Button>
                  </SmallImagePicker>
                </Col>
                <Col span={4}>
                  <SmallImagePicker
                    imgStyle={{ maxHeight: '32px' }}
                    value={k.hoverLogo}
                    onChange={imgUrl => {
                      props.onChange(
                        immutateUpdate(
                          props.value,
                          [index, 'apps', index, 'hoverLogo'],
                          () => imgUrl
                        )
                      )
                    }}
                  >
                    <Button>
                      <UploadOutlined /> 上传
                    </Button>
                  </SmallImagePicker>
                </Col>
                <Col
                  span={2}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-around',
                    alignItems: 'center'
                  }}
                >
                  <PlusOutlined
                    className="pointer color-main add-btn"
                    onClick={() => {
                      props.onChange(
                        immutateUpdate(props.value, [index, 'apps'], apps =>
                          insert(apps, ind, {})
                        )
                      )
                    }}
                  />
                  <CloseOutlined
                    className="pointer color-red close-btn"
                    onClick={() => {
                      props.onChange(
                        immutateUpdate(props.value, [index, 'apps'], apps =>
                          apps.filter((a, j) => j !== ind)
                        )
                      )
                    }}
                  />
                </Col>
              </Row>
            </div>
          )
          k.key = index+'-'+ind
          return k
        })
      }
      i.title = (
        <div>
          <CloseCircleOutlined
            className="absolute pointer color-red hover-display-iblock"
            style={{
              top: '0px',
              right: '0px',
              transform: 'translate(50%, -50%)',
              fontSize: '18px'
            }}
            onClick={() => {
              props.onChange(props.value.filter((a, j) => j !== index))
            }}
          />
          <FixWidthHelper toFix="first" 
            toFixWidth={null} 
            className="mg2l mg2t mg2b"
          >
            <div className="line-height32" >应用分组名称：</div>
            <Input
              value={i.name}
              onChange={(ev) => {
                const { value } = ev.target
                props.onChange(
                  immutateUpdate(props.value, [index, 'name'], () => value)
                )
              }}
            />
          </FixWidthHelper>
          {!i.apps.length && (
            <a
              href="#"
              className="child-add-box"
              onClick={(ev) => {
                ev.preventDefault()
                props.onChange(
                  immutateUpdate(props.value, [index, 'apps'], (apps) => [
                    ...(apps || []),
                    {}
                  ])
                )
              }}
            >
              <PlusOutlined /> 新增一个应用
            </a>
          )}
        </div>
      )
      i.key = index+''
      arr.push(i.key)
      return i
    })
    this.setState({
      data:val,
      expandedKeys:arr
    })
  }
  onDragEnter = info => {
    console.log(info)
    // expandedKeys 需要受控时设置
    // this.setState({
    //   expandedKeys: info.expandedKeys,
    // });
  };
  //拖拽
  onDrop = info => {
    console.log(info,'info----')
    const newData = JSON.parse(JSON.stringify(this.props.value))
    const dropKey = info.node.key.split('-')
    const dragKey = info.dragNode.key.split('-')
    if(dragKey.length>1){
      if(dropKey.length < 2) return false
      this.dragData = JSON.parse(JSON.stringify(newData[dragKey[0]].apps[dragKey[1]]))
      this.drapData = JSON.parse(JSON.stringify(newData[dropKey[0]].apps[dropKey[1]]))
      newData[dragKey[0]].apps[dragKey[1]] = null
      newData[dragKey[0]].apps.splice(dropKey[1],0,this.dragData)
      newData[dragKey[0]].apps = newData[dragKey[0]].apps.filter((val)=>{
        return val
      })
      this.props.onChange(newData)
    }else{
      this.dragData = JSON.parse(JSON.stringify(newData[dragKey[0]]))
      this.drapData = JSON.parse(JSON.stringify(newData[dropKey[0]]))
    }
    
  };

  render() {
    console.log('AppItem -> render -> this.state.data', this.state.data)

    return (
      <div className="portal-tree-box">
        <Tree
          className="draggable-tree"
          draggable
          blockNode
          onDragEnter={this.onDragEnter}
          onDrop={this.onDrop}
          defaultExpandAll
          expandedKeys={this.state.expandedKeys}
          treeData={this.state.data}
        />
        <a
          href="#"
          className="group-box-add"
          onClick={(ev) => {
            ev.preventDefault()
            this.props.onChange([...(this.props.value || []), { name: '', apps: [{}] }])
          }}
        >
          <PlusOutlined style={{marginRight:'5px'}} />
        新增应用分组
        </a>
      </div>
    )
  }
}

export default AppItem
