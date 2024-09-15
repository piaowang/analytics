import React from 'react'

import {
  ArrowRightOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  LoginOutlined,
  LogoutOutlined,
  SyncOutlined
} from '@ant-design/icons'


const ASSEMBLER ='输出转换器'
const READER = '读取器'
const PARSER = '输入转换器'
const WRITER = '写入器'
const CONVERTER = '过滤器'
export default class TaskChain extends React.Component {


  render() {
    const {editPanel, ETLTaskComponent, taskChangeOnclick} = this.props

    return (
      <div className="access-type">


        <div className={`access-type-item${editPanel === ETLTaskComponent.reader ? ' active' : ''}`}
          onClick={() => {
            taskChangeOnclick(ETLTaskComponent.reader)
          }}
        >
          <div className="access-icon-box">
            <FileTextOutlined />
          </div>
          <div className="access-text-box">{READER}</div>
        </div>


        <div className="inline width60 aligncenter">
          <div className="access-icon-box">
            <ArrowRightOutlined />
          </div>
        </div>


        <div className={`access-type-item${editPanel === ETLTaskComponent.parser ? ' active' : ''}`}
          onClick={() => {
            taskChangeOnclick(ETLTaskComponent.parser)
          }}
        >
          <div className="access-icon-box">
            <LoginOutlined />
          </div>
          <div className="access-text-box">{PARSER}</div>
        </div>


        <div className="inline width60 aligncenter">
          <div className="access-icon-box">
            <ArrowRightOutlined />
          </div>
        </div>

        <div className={`access-type-item${editPanel === ETLTaskComponent.converter ? ' active' : ''}`}
          onClick={() => {
            taskChangeOnclick(ETLTaskComponent.converter)
          }}
        >
          <div className="access-icon-box">
            <SyncOutlined />
          </div>
          <div className="access-text-box">{CONVERTER}</div>
        </div>


        <div className="inline width60 aligncenter">
          <div className="access-icon-box">
            <ArrowRightOutlined />
          </div>
        </div>


        <div className={`access-type-item${editPanel === ETLTaskComponent.assembler ? ' active' : ''}`}
          onClick={() => {
            taskChangeOnclick( ETLTaskComponent.assembler)
          }}
        >
          <div className="access-icon-box">
            <LogoutOutlined />
          </div>
          <div className="access-text-box">{ASSEMBLER}</div>
        </div>


        <div className="inline width60 aligncenter">
          <div className="access-icon-box">
            <ArrowRightOutlined />
          </div>
        </div>

        <div className={`access-type-item${editPanel === ETLTaskComponent.writer ? ' active' : ''}`}
          onClick={() => {
            taskChangeOnclick( ETLTaskComponent.writer)
          }}
        >
          <div className="access-icon-box">
            <DatabaseOutlined />
          </div>
          <div className="access-text-box">{WRITER}</div>
        </div>
      </div>
    )
  }


}
