import React from 'react'
import { Select } from 'antd'
import { enableSelectSearch } from '../../common/antd-freq-use-props'
import deepCopy from '../../../common/deep-copy'
import _ from 'lodash'
import * as ls from '../../common/localstorage'
import {
  getProjListLSId,
  getCurrentProjLSId,
  checkPathShouldHideProjectMenu
} from './common'

const { Option } = Select

export default class ProjectSelect extends React.Component {
  onChange = id => {
    let projectList = deepCopy(this.props.projectList)
    let rmd = _.remove(projectList, p => p.id === id)
    projectList = [...rmd, ...projectList]
    ls.set(
      getProjListLSId,
      projectList.map(p => p.id)
    )
    ls.set(getCurrentProjLSId, id)
    let proj = _.find(projectList, { id })
    let datasourceCurrent = _.find(this.props.datasourceList, {
      id: proj.datasource_id
    })
    this.props.modifier({
      projectCurrent: proj,
      datasourceCurrent,
      projectList
    })
  };

  render() {
    let {
      projectList,
      location: { pathname },
      projectCurrent,
      changeProject
    } = this.props
    if (!projectList.length || checkPathShouldHideProjectMenu(pathname)) {
      return null
    }
    return (
      <div className="iblock mg10r project-select-menu">
        <span className="mg10r">切换项目</span>
        <Select
          {...enableSelectSearch}
          dropdownMatchSelectWidth={false}
          className="width160"
          onChange={changeProject}
          value={projectCurrent.id}
        >
          {projectList.map(p => {
            let { id, name } = p
            return (
              <Option key={id} value={id}>
                {name}
              </Option>
            )
          })}
        </Select>
      </div>
    )
  }
}
