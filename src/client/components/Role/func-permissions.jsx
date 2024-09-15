import React from 'react'
import deepCopy from '../../../common/deep-copy'
import _ from 'lodash'
import {filterPermission} from './constants'
import {
  Table,
  Checkbox,
  Collapse
} from 'antd'
import menuData from '../Home/menu-data'
import {checkPermission} from '../../common/permission-control'
import FixWidthHelper from '../Common/fix-width-helper-no-hidden'
import classNames from 'classnames'

const {Panel} = Collapse

const canEditFuncPermission = checkPermission('post:/app/role/function-permission-management')

const classOrderDictByMenu = _.fromPairs(menuData().map((m, idx) => [m.title, idx + 1]))
const groupOrderDictByMenu = _.fromPairs(_(menuData()).flatMap(m => m.children).map((g, idx) => [g.title, idx + 1]).value())
const methodOrderDict = {
  get: 1,
  GET: 1,
  post: 2,
  POST: 2,
  put: 3,
  PUT: 3,
  'delete': 4,
  DELETE: 4
}

//检查arr是否包含subArr
function include(arr, subArr) {
  if(arr.length < subArr.length) return false
  let res = true
  for (let i = 0, len = subArr.length;i < len;i ++) {
    if (!_.find(arr, o => o === subArr[i])) {
      res = false
      break
    }
  }
  return res
}

//检查arr是否部分包含subArr
function partialInclude(arr, subArr) {
  let count = 0
  for (let i = 0, len = subArr.length;i < len;i ++) {
    if (_.find(arr, o => o === subArr[i])) {
      count ++
    }
  }
  return count && count < subArr.length
}

//移除
export default class Rolelist extends React.Component {

  onToggle = (ug, prop) => {
    return e => {
      let value = e.target.checked
      let propValue = ug[prop]
      let role = deepCopy(this.props.role)
      let {funcPermissions} = role
      let {permissions, modifier} = this.props
      let commons = permissions.filter(p => p.common).map(p => p.id)

      let allIds = permissions.filter(p => {
        return p[prop] === propValue
      }).map(p => p.id)
      let newArr
      if (value) {
        newArr = _.uniq(funcPermissions.concat(allIds, ...commons))
      } else {
        newArr = _.uniq(_.without(funcPermissions, ...allIds).concat(commons))
      }
      role.funcPermissions = newArr
      modifier({role})
    }
  }

  checkValue = (ug, prop) => {
    let propValue = ug[prop]
    let funcPermissions = deepCopy(this.props.role.funcPermissions)
    let {permissions} = this.props
    let allIds = permissions.filter(p => {
      return p[prop] === propValue
    }).map(p => p.id)
    return include(funcPermissions, allIds)
  }

  checkDisabled = (ug, prop) => {
    if (!canEditFuncPermission || this.props.role.type === 'built-in') {
      return true
    }
    let propValue = ug[prop]
    let {permissions} = this.props
    let commonPermissions = permissions.filter(p => p.common).map(p => p.id)
    let allIds = permissions.filter(p => {
      return p[prop] === propValue
    }).map(p => p.id)
    return include(commonPermissions, allIds)
  }

  checkIndeterminate = (ug, prop) => {
    let propValue = ug[prop]
    let funcPermissions = deepCopy(this.props.role.funcPermissions)
    let {permissions} = this.props
    let allIds = permissions.filter(p => {
      return p[prop] === propValue
    }).map(p => p.id)
    return partialInclude(funcPermissions, allIds)
  }

  checkPathValue = ug => {
    let {funcPermissions} = this.props.role
    let {id} = ug
    return funcPermissions.includes(id)
  }

  onTogglePath = ug => {
    return () => {
      let role = deepCopy(this.props.role)
      let {funcPermissions} = role
      let {id} = ug
      let newArr
      if (funcPermissions.includes(id)) {
        newArr = _.without(funcPermissions, id)
      } else {
        newArr = [...funcPermissions, id]
      }
      let {modifier} = this.props
      role.funcPermissions = newArr
      modifier({role})
    }
  }

  getPermissions = () => {
    let permissions = filterPermission(this.props.permissions)
    let groupTree = _.groupBy(permissions, 'group')
    let groups = _.keys(groupTree)
    let orderedGroups = _.orderBy(groups, g => groupOrderDictByMenu[g] || 999)

    let byLib = v => v.lib === 'controllers/page.controller' ? '' : v.lib
    let byMethod = v => methodOrderDict[v.method] || 999
    let arr = orderedGroups.map(group => {
      let values = groupTree[group]
      return {
        group,
        class: values[0].class,
        rowSpan: {},
        values: _.orderBy(values, [byLib , byMethod])
      }
    })
    let classTree = _.groupBy(arr, 'class')
    let classes = _.keys(classTree)
    let orderedClasses = _.orderBy(classes, c => classOrderDictByMenu[c] || 999)
    let final = orderedClasses.reduce((prev, cls) => {
      let arr0 = classTree[cls]
      arr0 = arr0.map((r, i) => {
        r.rowSpan.class = i ? 0 : arr0.length
        return r
      })
      return prev.concat(arr0)
    }, [])
    return final
  }

  render() {
    let data = this.getPermissions()
    let classesGroup = _.groupBy(data, lib => lib.class)
    let canEdit = canEditFuncPermission && this.props.role.type !== 'built-in'
    let classes = _.keys(classesGroup)
    if (_.isEmpty(classes)) {
      return (
        <div className="pd3 aligncenter color-grey">
          加载中...
        </div>
      )
    }
    return (
      <Collapse defaultActiveKey={classes} >
        {classes.map(clsName => {
          let libs = classesGroup[clsName]
          let firstLib = _.first(libs)
          let classCheckbox = (
            <span
              className="mg2l"
              onClick={ev => {
                ev.stopPropagation()
                return false
              }}
            >
              <Checkbox
                onChange={this.onToggle(firstLib, 'class')}
                checked={this.checkValue(firstLib, 'class')}
                disabled={this.checkDisabled(firstLib, 'class')}
                indeterminate={this.checkIndeterminate(firstLib, 'class')}
              >
                {clsName}
              </Checkbox>
            </span>
          )
          return (
            <Panel
              header={classCheckbox}
              key={clsName}
              className="remove-panel-content-padding"
            >
              {libs.map((lib, idx) => {
                return (
                  <FixWidthHelper
                    toFix="first"
                    toFixWidth="200px"
                    key={lib.group}
                    className="relative"
                    wrapperClass={'pd1y bordert permission-box'}
                    wrapperClassFirst="pd2x"
                    wrapperClassLast="pd2x borderl"
                  >
                    {<Checkbox
                      onChange={this.onToggle(lib, 'group')}
                      checked={this.checkValue(lib, 'group')}
                      disabled={this.checkDisabled(lib, 'group')}
                      indeterminate={this.checkIndeterminate(lib, 'group')}
                    >
                      {lib.group}
                    </Checkbox>}
                    {lib.values.map(perm => {
                      return (
                        <Checkbox
                          key={perm.title}
                          onChange={this.onTogglePath(perm)}
                          disabled={!canEdit || !!perm.common}
                          checked={this.checkPathValue(perm)}
                        >
                          {perm.title}
                        </Checkbox>
                      )
                    })}
                  </FixWidthHelper>
                )
              })}
            </Panel>
          )
        })}
      </Collapse>
    )
  }
}
