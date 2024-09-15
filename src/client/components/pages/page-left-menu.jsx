import { ArrowRightOutlined } from '@ant-design/icons'
import { Col } from 'antd'

export default function PageLeftMenu (props) {
  const { cdn, siteName, loginLogoName } = window.sugo
  let { activeMenu, menus = [] } = props
  menus = menus.length
    ? menus
    : [
      {
        path: '/login',
        title: '登录'
      },
      {
        path: '/retrieve-password',
        title: '找回密码'
      }
    ]
  let logoPath = loginLogoName.includes('/')
    ? `${cdn}${loginLogoName}`
    : `${cdn}/static/images/${loginLogoName}`
  return (
    <Col span={5} className="left-menu pd3y alignright">
      <div className="logo pd2x">
        <a className="block elli pointer" href="/" title={siteName}>
          <img
            className="iblock profile-photo width-100"
            src={logoPath}
            alt="SUGO"
          />
          <span className="block title mg1t font16 color-white">数果星盘</span>
        </a>
      </div>
      <ul className="menu pd2y font16">
        {menus.map((menu) => {
          let { path, title } = menu
          return (
            <li key={path} className={activeMenu === path ? 'on' : 'off'}>
              <a href={path}>
                <ArrowRightOutlined />
                {title}
              </a>
            </li>
          )
        })}
      </ul>
    </Col>
  )
}
