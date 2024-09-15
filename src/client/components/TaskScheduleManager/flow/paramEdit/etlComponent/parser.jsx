import React from 'react'
import PropTypes from 'prop-types'
import { DownOutlined } from '@ant-design/icons'
import { Button, Dropdown, Menu, Input, Row, Col } from 'antd'
import _ from 'lodash'

const JSON = 'json'
const CSV = 'csv'
const GROK = 'grok'

const redDotColor = '#DC143C'
const redDotSize = '17px'
const redDotTop = '4px'
export default class Parser extends React.Component {

  static propTypes = {
    changeState: PropTypes.func,
    parser: PropTypes.object,
    taskMap: PropTypes.object
  }

  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps.parser, this.props.parser)) {
      console.log(this.props.parser, 'handleMenuClick====', prevProps.parser)
    }
  }

  setParentConverters(parser) {
    let {taskMap = {}} = this.props
    this.props.changeState({
      taskMap: {
        ...taskMap,
        cleaner:{
          ...(taskMap.cleaner || {}),
          parser: parser
        }
      }
    })
  }


  menu = () => {
    return (
      <Menu onClick={(e) => this.handleMenuClick(e)}>
        <Menu.Item key={JSON}> {JSON} </Menu.Item>
        <Menu.Item key={CSV}>{CSV}</Menu.Item>
        <Menu.Item key={GROK}>{GROK}</Menu.Item>
      </Menu>
    )
  }

  handleMenuClick = (e) => {
    let parser = {}
    switch (e.key) {
      case JSON:
        parser = {
          type: JSON
        }
        break
      case CSV:
        parser = {
          type: CSV,
          separator:',',
          columnNames:''
        }
        break
      case GROK:
        parser = {
          type: GROK,
          expr:'',
          patternsPath:'conf/patterns',
          ipField:'',
          ipFile:'conf/sugoip.txt',
          needField:''

        }
        break
    }
    this.setParentConverters(parser)
  }


  selectParser = parser => {
    switch (parser.type) {
      case JSON:
        return this.jsonParser(parser)
      case CSV:
        return this.csvParser(parser)
      case GROK:
        return this.grokParser(parser)
    }
  }

  grokParser = (parser) => {
    return (
      <div className="mg1l">
        <Row>
          <Col span={3}>
            <div className="fright">
              <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                className="alignright iblock"
              >*
              </div>
              <div className="fright" style={{ marginTop:'7px'}}>grok表达式:</div>

            </div>
          </Col>
          <Col span={21}>
            <Input className="mg2l mg3r"
              style={{width: '60%'}}
              value={parser.expr}
              placeholder={'请输入用于匹配数据的grok表达式'}
              onChange={(v) => this.handleChange(v.target.value, 'expr')}
            />
          </Col>
        </Row>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{ marginTop:'7px'}}>patterns文件路径:</div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={parser.patternsPath}
                placeholder={'请输入patterns文件的路径'}
                onChange={(v) => this.handleChange(v.target.value, 'patternsPath')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{ marginTop:'7px'}}>ip字段名:</div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={parser.ipField}
                placeholder={'请输入数据中的ip字段名'}
                onChange={(v) => this.handleChange(v.target.value, 'ipField')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{ marginTop:'7px'}}>关联ip文件路径:</div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={parser.ipFile}
                placeholder={'请输入存储关联ip的额外信息文件的路径'}
                onChange={(v) => this.handleChange(v.target.value, 'ipFile')}
              />
            </Col>
          </Row>
        </div>

        <div className="mg2t">
          <Row>
            <Col span={3}>
              <div className="fright" style={{ marginTop:'7px'}}>ip文件中的字段名:</div>
            </Col>
            <Col span={21}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={parser.needField}
                placeholder={'请输入需要的ipFile中的字段名'}
                onChange={(v) => this.handleChange(v.target.value, 'needField')}
              />
            </Col>
          </Row>
        </div>


      </div>
    )
  }



  csvParser = (parser) => {
    return (
      <div className="mg1l">

        <Row>
          <Col span={2}>
            <div className="fright" style={{ marginTop:'7px'}}>列分隔符:</div>
          </Col>
          <Col span={22}>
            <Input className="mg2l mg3r"
              style={{width: '60%'}}
              value={parser.separator}
              placeholder={'请输入列分割符'}
              onChange={(v) => this.handleChange(v.target.value, 'separator')}
            />
          </Col>
        </Row>


        <div className="mg2t">
          <Row>
            <Col span={2}>
              <div className="fright">
                <div style={{color: redDotColor, marginTop: redDotTop, fontSize: redDotSize}}
                  className="alignright iblock"
                >*
                </div>
                <div className="fright" style={{ marginTop:'7px'}}>字段名称:</div>

              </div>
            </Col>
            <Col span={22}>
              <Input className="mg2l mg3r"
                style={{width: '60%'}}
                value={parser.columnNames}
                placeholder={'请输入字段名，通过英文逗号隔开'}
                onChange={(v) => this.handleChange(v.target.value, 'columnNames')}
              />
            </Col>
          </Row>
        </div>
      </div>
    )
  }

  jsonParser = () => {
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
    const {parser} = this.props
    if (_.isEmpty(parser)) return
    return this.selectParser(parser)

  }

  render() {
    let {parser} = this.props
    return (
      <div>
        <Dropdown overlay={this.menu()} className="mg2t">
          <Button style={{marginLeft: 8}}>
            {_.isEmpty(parser)?'选择输入转换器':parser.type} 
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
