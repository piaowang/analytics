import React from 'react'
import PropTypes from 'prop-types'
import { PlusCircleOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { Card, Popover, Popconfirm, Input, Checkbox, Modal, Button, Row, Col } from 'antd';
import _ from 'lodash'
import SugoIcon from '../Common/sugo-icon'

export default class pageCategories extends React.Component {

  static propTypes = {
    pageCategories: PropTypes.array,                  //页面分类集合
    categotiesLoading: PropTypes.bool.isRequired,     //loading
    chagePageCategories: PropTypes.func.isRequired,   //改变页面分类
    delPageCategories: PropTypes.func.isRequired,     //删除页面分类
    savePageCategories: PropTypes.func.isRequired,    //保存
    changeState: PropTypes.func.isRequired,           //修改状态
    addPageCategories: PropTypes.func.isRequired      //新增
  }

  constructor(props) {
    super(props)
  }

  render() {
    let {
      pageCategories = [], categotiesLoading, chagePageCategories, delPageCategories,
      savePageCategories, changeState, addPageCategories, panelHeight
    } = this.props
    let item = pageCategories.map((p, i) => {
      return (
        <Row className="mg1b" key={'eventlistitem' + p.name}>
          <Col span="10">
            <Input
              size="small"
              defaultValue={p.name}
              onChange={(e) => {
                chagePageCategories(i, 'name', e.target.value.trim())
              }}
            />
          </Col>

          <Col span="1" />

          <Col span="11">
            <Input
              className="pd1l"
              size="small"
              defaultValue={p.regulation}
              onChange={(e) => {
                chagePageCategories(i, 'regulation', e.target.value.trim())
              }}
            />
          </Col>
          <Col span="2">
            <a
              className="pointer"
              onClick={() => delPageCategories(i)}
              title="删除分类"
            >
              <SugoIcon
                type="sugo-trash"
                className="color-grey font14 pointer hover-color-red mg1l mg2t"
              />
            </a>
          </Col>
        </Row>
      )
    })

    let content = (<div>
      <b>页面路径规则说明</b>
      <p>数据上报时将会按照页面路径规则自动上报页面分类名称。</p>
      <p>页面路径规则可输入完整页面路径或添加“*”号的正则表达式。</p>
      <p><b>示例：</b></p>
      <p><b>分类名称：</b>新浪体育</p>
      <p><b>页面路径规则：</b>sports.sina.com.cn/*</p>
      <p>上述设置会将页面路径中以"sports.sina.com.cn/"开头的所有页面，归为“新浪体育”分类。</p>
      <p>例如页面"sports.sina.com.cn/g/laliga/2017-08-09/doc-ifyitamv7507779.shtml"</p>
      <p>将被归为新浪体育进行上报。当两个页面路径规则出现交错时，</p>
      <p>系统自动采用匹配字符数最多的规则。</p>
      <p><b>示例：</b></p>
      <p><b>分类名称：</b>新浪体育</p>
      <p><b>页面路径规则：</b>sports.sina.com.cn/*</p>
      <p><b>分类名称：</b>新浪体育-英超</p>
      <p><b>页面路径规则：</b>sports.sina.com.cn/g/laliga/*</p>
      <p>页面"sports.sina.com.cn/g/laliga/2017-08-09/doc-ifyitamv7507779.shtml"</p>
      <p>将会被归类为“新浪体育-英超”， 因为此规则的匹配度更高。</p>
    </div>)

    let buttons = (
      <div className="mg1t">
        <Button
          key="btnSave"
          type="success"
          size="small"
          loading={categotiesLoading}
          onClick={() => savePageCategories()}
        >保存</Button>
        <Button
          key="btnCancel"
          className="mg1l"
          size="small"
          onClick={() => changeState({ categotiesMode: false })}
        >取消</Button>
      </div>
    )
    return (
      <Card
        title="页面分类设置"
        bodyStyle={{ padding: 5 }}
        extra={buttons}
      >
        <div className="pd1">
          <Row className="mg1b">
            <Col span="12">
              <b>分类名称</b>
            </Col>
            <Col span="12" className="alignright">
              <b>页面路径规则</b>
              <Popover
                placement="topLeft"
                content={content}
              >
                <QuestionCircleOutlined className="font14 mg1l" />
              </Popover>
            </Col>
          </Row>
          <div
            style={{
              height: panelHeight,
              overflowY: 'auto'
            }}
          >
            {item}
          </div>
          <div className="bordert alignright pd2t">
            <a
              className="pointer"
              onClick={() => addPageCategories()}
              title="添加分类"
            >
              <PlusCircleOutlined className="mg1r" />
              添加一个分类
            </a>
          </div>
        </div>
      </Card>
    );
  }
}
