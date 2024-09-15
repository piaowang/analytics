import React from 'react'
import PropTypes from 'prop-types'
import { Drawer, Tooltip, Menu, Card } from 'antd'
import Icon from '~/components/common/sugo-icon'
import { LeftCircleOutlined } from '@ant-design/icons'
import './customer-service.styl'
import _ from 'lodash'
import Search from '../Common/search'
import withAutoFocus from '../Common/auto-focus'
import { checkPathShouldHideProjectMenu } from './common'
import classnames from 'classnames'
import { withDebouncedOnChange } from '../Common/with-debounce-on-change'
import smartSearch from 'common/smart-search'

const InputWithDebouncedOnChange = withDebouncedOnChange(Search, ev => ev.target.value, 500)
const InputWithAutoFocus = withAutoFocus(InputWithDebouncedOnChange)


export default class ProjectSelectDrawer extends React.Component {

  static propTypes = {
    projectList: PropTypes.array,
    datasourceList: PropTypes.array,
    projectCurrent: PropTypes.object,
    changeProject: PropTypes.func,
    location: PropTypes.object,
    modifier: PropTypes.func
  }

  state = {
    collapse: false, // 项目列表面板
    visible: false, // 显示项目菜单
    searchingText: '' // 搜索项目关键字
  }

  togglerContent = () => {
    const { collapse } = this.state
    this.setState({ collapse: !collapse })
  }

  toggleMenu = () => {
    const { visible } = this.state
    this.setState({ visible: !visible })
  }

  // onChange = id => {
  //   let projectList = deepCopy(this.props.projectList)
  //   let rmd = _.remove(projectList, p => p.id === id)
  //   projectList = [...rmd, ...projectList]
  //   ls.set(getProjListLSId, projectList.map(p => p.id))
  //   ls.set(getCurrentProjLSId, id)
  //   let proj = _.find(projectList, {id})
  //   let datasourceCurrent = _.find(this.props.datasourceList, {
  //     id: proj.datasource_id
  //   })
  //   this.props.modifier({
  //     projectCurrent: proj,
  //     datasourceCurrent,
  //     projectList
  //   })
  // }

  modelClickHanlder = ({ item: obj }) => {
    const { item } = obj.props
    const { changeProject } = this.props
    this.setState({ collapse: false })
    changeProject(item.id, item.datasource_id)
  }

  render() {
    const { projectList, location: { pathname }, projectCurrent } = this.props
    if (
      !projectList.length ||
      checkPathShouldHideProjectMenu(pathname)
    ) {
      return null
    }
    const { collapse, visible = false, searchingText } = this.state
    const selectedKey = _.isEmpty(projectCurrent) ? [] : [projectCurrent.id]
    return (
      <React.Fragment>
        <div className="project-select-drawer-handle" style={{right: collapse ? 280 : 2}}>
          <div className={classnames({ hide: collapse || visible })}>
            <Tooltip placement="left" title={projectCurrent.name}>
              <div className="text" onClick={this.togglerContent}>
                <div className="font16 content">{projectCurrent.name}</div>
              </div>
            </Tooltip>
            <Tooltip placement="left" title="隐藏项目">
              <div className="icon" onClick={this.toggleMenu}>
                <Icon
                  className="font18"
                  style={{marginTop: 10}}
                  type="sugo-eye-invisible"
                />
              </div>
            </Tooltip>
          </div>
          <div className="hide" style={{display: visible === true ? 'block' : 'none'}}>
            <Tooltip placement="left" title="显示项目">
              <div
                className="mini-icon absolute"
                style={{top: 120, right: 2}}
                onClick={this.toggleMenu}
              >
                <LeftCircleOutlined
                  className="font16"
                  style={{marginTop: 14}}
                  type="left-circle"
                />
              </div>
            </Tooltip>
          </div>
          <div  className="hide" style={{display: collapse === true ? 'block' : 'none'}}>
            <div
              className="mini-icon absolute"
              style={{top: 120, right: 2}}
              onClick={this.togglerContent}
            >
              <Icon
                className="font16"
                style={{marginTop: 14}}
                type="right"
              />
            </div>
          </div>
        </div>

        <Drawer
          width={300}
          closable={false}
          onClose={this.togglerContent}
          visible={collapse}
          placement="right"
          className="project-select-drawer"
          style={{
            zIndex: 999
          }}
        >
          <div
            className="pd2"
            style={{background: '#3A404E'}}
          >
            <InputWithAutoFocus
              placeholder="请输入项目名称"
              value={searchingText}
              onChange={val => {
                this.setState({searchingText: val})
              }}
            />
          </div>
          <div >
            <Card
              title={<span><Icon type="sugo-detail" className="mg1r font18"/> 项目列表</span>}
              headStyle={{background: '#F3F3F3'}}
              bodyStyle={{padding: '5px 14px 14px 14px'}}
              bordered={false}
            >
              <Menu mode="inline" selectedKeys={selectedKey} onClick={this.modelClickHanlder}>
                {
                  projectList.filter(p => searchingText ? (smartSearch(searchingText, p.name) || smartSearch(searchingText, p.datasource_id)) : true).map(p => {
                    const {id, name} = p
                    return (
                      <Menu.Item style={{paddingLeft: 14}} item={p} key={id} value={id}>
                        <Tooltip placement="topLeft" key={'tip-' + id} title={name}>{name}</Tooltip>
                      </Menu.Item>
                    )
                  })
                }
              </Menu>
            </Card>
          </div>
        </Drawer>
      </React.Fragment>
    )
  }
}
