import React from 'react'
import Icon from '../Common/sugo-icon'
import { Tooltip } from 'antd'
import classNames from 'classnames'
import _ from 'lodash'
import Link from '../Common/link-nojam'
import * as PubSub from 'pubsub-js'
import { immutateUpdate, recurFind } from 'common/sugo-utils'
import { checkPermission } from 'client/common/permission-control'
import DynamicMenuTitle from 'client/components/MonitorAlarms/dynamic-menu-title'
import { get as getSessionStorage } from '../../common/session-storage'

const { defaultPage } = window.sugo

const dynamicTitleComponentMap = {
  'dynamic-menu-title': DynamicMenuTitle
}

function LinkAdaptHref(props) {
  let { to, children, ...rest } = props
  if (_.startsWith(to, 'http') || rest.target === '_blank') {
    return (
      <a href={to} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link to={to} {...rest}>
      {children}
    </Link>
  )
}

class ASider extends React.Component {
  state = {
    subMenusOverwrite: null
  }

  componentDidUpdate(prevProps) {
    if (!_.isEqual(prevProps.subMenus, this.props.subMenus)) {
      this.setState({ subMenusOverwrite: null })
    }
  }

  checkActive = (query = '', menu, activeOnlyWhenStrictMatch) => {
    let menuPath = menu.path
    let { pathname, search } = this.props.location
    if (pathname === '/console') {
      pathname = defaultPage || '/console/index'
    }
    if (_.includes(menuPath, '/console/dimension')) {
      const _q = 'datasource_type=tag'
      return pathname === menuPath && ((_.includes(search, _q) && _.includes(query, _q)) || (!_.includes(search, _q) && !_.includes(query, _q)))
    } else {
      // 如果匹配到子节点，父节点也要高亮
      const pathWithSearch = `${pathname}${search}`

      if (activeOnlyWhenStrictMatch) {
        return pathname === menuPath
      } else {
        return (
          pathname === menuPath ||
          menuPath === pathWithSearch ||
          _.includes(pathname, menuPath) ||
          recurFind(
            menu.children,
            m => m.children,
            m => {
              let menuPath = m.path
              return pathname === menuPath || menuPath === pathWithSearch || _.includes(pathname, menuPath)
            }
          )
        )
      }
    }
  }

  renderCopyRight = txt => {
    return txt.split(';').reduce((p, c, i) => {
      return [...p, i ? <br /> : null, c]
    }, [])
  }

  render() {
    let {
      subMenus,
      location: { pathname, search },
      onMenuChange,
      compactMenu,
      onToggleMenuCompact,
      projectCurrent
    } = this.props
    let { subMenusOverwrite } = this.state

    if (!_.isEmpty(subMenusOverwrite)) {
      subMenus = subMenusOverwrite
    }
    let { copyrightText } = window.sugo

    let displayMenu = (menu, idx, arr, depth = 1, pathArr = [idx]) => {
      let {
        title,
        path,
        query = '',
        icon = 'bars',
        type,
        disabled = !path,
        activeWhen,
        expand = 1,
        authPermission,
        enableURLTemplate,
        target,
        hide,
        className = '',
        style = {}
      } = menu
      if (hide) {
        return null
      }
      if (disabled === 'whenNotCompact') {
        disabled = !compactMenu
      }
      if (authPermission) {
        let hasPerm = checkPermission(authPermission)
        if (!hasPerm) {
          return null
        }
      }
      let cls = classNames('aside-menu relative', `depth-${depth}`, {
        active: path && (activeWhen === 'onlyInCompactMode' ? compactMenu && this.checkActive(query, menu) : this.checkActive(query, menu, activeWhen === 'onlyStrictMatch'))
      })
      if (type === 'label') {
        return (
          <div key={idx + '@' + title} className='ignore-mouse aside-menus-grouplabel'>
            <div className='aside-menu-txt'>{title}</div>
          </div>
        )
      } else {
        if (_.startsWith(title, 'component:')) {
          let [, componentName] = title.split(':')
          let Comp = dynamicTitleComponentMap[componentName]
          title = <Comp {...menu.componentProps} projectCurrent={projectCurrent} PubSub={PubSub} />
        }
        let url = enableURLTemplate ? _.template(path)(this.props) : path
        if (!url && enableURLTemplate) {
          // 监控告警左侧菜单的二级菜单，path 会为 false，但仍需显示
          return null
        }
        let Link0 = disabled ? 'span' : LinkAdaptHref
        let dom = (
          <Tooltip key={path + idx + '@-tip-' + menu.title} placement='right' title={title} {...(compactMenu ? undefined : { visible: false })}>
            <Link0
              key={path + idx + '@' + menu.title}
              to={url + query}
              onClick={disabled ? undefined : onMenuChange}
              className={`${cls} ${compactMenu ? '' : className}`}
              style={compactMenu ? {} : style}
              target={target}
            >
              {icon ? (
                <span className='aside-menu-icon'>
                  <Icon className={compactMenu ? 'font16' : ''} type={icon} />
                </span>
              ) : null}
              <span className='aside-menu-txt'>
                {title}
                {_.some(menu.children, m => !m.hide) && !compactMenu ? (
                  <Icon
                    type={expand ? 'minus' : 'plus'}
                    className='color-white vertical-center-of-relative right2 bold font14 fpointer'
                    onClick={() => {
                      this.setState({
                        subMenusOverwrite: immutateUpdate(subMenus, [...pathArr, 'expand'], (prev = 1) => !prev)
                      })
                    }}
                  />
                ) : null}
              </span>
            </Link0>
          </Tooltip>
        )
        if (_.isArray(menu.children) && expand) {
          return [dom, ...menu.children.map((m, idx, arr) => displayMenu(m, idx, arr, depth + 1, [...pathArr, 'children', idx]))]
        }
        return dom
      }
    }

    let { hideTopNavigator = getSessionStorage('hideTopNavigator') } = (location && location.query) || {}

    return (
      <div className='contain-docs-nav' style={hideTopNavigator ? { top: 0 } : {}}>
        <div className='pd2x pdy12 alignright'>
          <Tooltip title='收起/展开左侧菜单' placement='right'>
            <span className='compact-icon-wrap pointer bold' onClick={onToggleMenuCompact}>
              <Icon type={compactMenu ? 'sugo-tab-right' : 'sugo-tab-left'} />
            </span>
          </Tooltip>
        </div>
        <div className='aside-menus'>{subMenus.map(displayMenu)}</div>
        <div className='copy-right-footer'>
          {copyrightText ? (
            <pre>{this.renderCopyRight(copyrightText)}</pre> // pre 可使 \n 生效
          ) : null}
        </div>
      </div>
    )
  }
}

export default ASider
