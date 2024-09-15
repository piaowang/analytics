import React from 'react'
import PropTypes from 'prop-types'
import { DownOutlined } from '@ant-design/icons'
import { Button, Dropdown, Menu, Input, Row, Col } from 'antd'
import _ from 'lodash'

const JSON = 'json'
const CSV = 'csv'
const GROK = 'grok'

export default class Assembler extends React.Component {

  static propTypes = {
    changeState: PropTypes.func,
    assembler: PropTypes.object,
    taskMap: PropTypes.object
  }

  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps.assembler, this.props.assembler)) {
      console.log(this.props.assembler, 'handleMenuClick====', prevProps.assembler)
    }
  }

  setParentConverters(assembler) {
    let {taskMap} = this.props
    if (_.isEmpty(taskMap)){
      taskMap={
        cleaner:{

        }
      }
    }
    this.props.changeState({
      taskMap: {
        ...taskMap,
        cleaner:{
          ...taskMap.cleaner,
          assembler: assembler
        }
      }
    })
  }


  menu = () => {
    return (
      <Menu onClick={(e) => this.handleMenuClick(e)}>
        <Menu.Item key={JSON}> {JSON} </Menu.Item>
        <Menu.Item key={CSV}>{CSV}</Menu.Item>
      </Menu>
    )
  }

  handleMenuClick = (e) => {
    let assembler = {}
    switch (e.key) {
      case JSON:
        assembler = {
          type: JSON
        }
        break
      case CSV:
        assembler = {
          type: CSV,
          separator:',',
          columnNames:''
        }
        break
      case GROK:
        assembler = {
          type: GROK
        }
        break
    }
    this.setParentConverters(assembler)
  }


  selectAssembler = assembler => {
    switch (assembler.type) {
      case JSON:
        return this.jsonAssembler(assembler)
      case CSV:
        return this.csvAssembler(assembler)
      case GROK:
        return this.consoleWriter(assembler)
    }
  }



  csvAssembler = (assembler) => {
    return (
      <div>
        <Row>
          <Col span={2}>
            <div className="fright" style={{ marginTop:'7px'}}>字段分隔符:</div>
          </Col>
          <Col span={22}>
            <Input className="mg2l mg3r"
              style={{width: '60%'}}
              value={assembler.separator}
              placeholder={'请输入列分割符'}
              onChange={(v) => this.handleChange(v.target.value, 'separator')}
            />
          </Col>
        </Row>


        <div className="mg2t">
          <Row>
            <Col span={2}>
              <div className="fright">
                <div className="fright" style={{ marginTop:'7px'}}>输出字段:</div>

              </div>
            </Col>
            <Col span={22}>

              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={assembler.columns}
                placeholder={'请输入字段，通过英文逗号隔开'}
                onChange={(v) => this.handleChange(v.target.value, 'columns')}
              />
            </Col>
          </Row>
        </div>
      </div>
    )
  }

  jsonAssembler = () => {
    return (
      <div />
    )
  }




  handleChange = (value, p) => {
    let {parser} = this.props
    _.set(parser, `${p}`, value)
    this.setParentConverters(parser)

  }

  getFields() {
    const {assembler} = this.props
    if (_.isEmpty(assembler)) return
    return this.selectAssembler(assembler)

  }
  render() {
    let {assembler} = this.props
    return (
      <div>
        <Dropdown overlay={this.menu()} className="mg2t">
          <Button style={{marginLeft: 8}}>
            {_.isEmpty(assembler)?'选择输出转换器':assembler.type} 
            <DownOutlined />
          </Button>
        </Dropdown>
        <div className="mg1l mg2t">
          {this.getFields()}
        </div>
      </div>
    )
  }


}
