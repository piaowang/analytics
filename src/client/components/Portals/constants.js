import DefaultLogin from './templates/default-login'
import DefaultHome from './templates/default-home'
import LoginPageConfigForm from './forms/default-login-config-form'
import HomePageConfigForm from './forms/default-home-config-form'

export const LOGIN_PAGE_TEMPLATE_ENUM = {
  defaultLogin: DefaultLogin
}
export const LOGIN_PAGE_TEMPLATE_TRANSLATION = {
  defaultLogin: '默认登录模板'
}

export const HOME_PAGE_TEMPLATE_ENUM = {
  defaultHome: DefaultHome
}
export const HOME_PAGE_TEMPLATE_TRANSLATION = {
  defaultHome: '默认门户模板'
}

export const PAGE_TYPE_TEMPLATE_DICT = {
  login: LOGIN_PAGE_TEMPLATE_ENUM,
  home: HOME_PAGE_TEMPLATE_ENUM
}

export const PAGE_TYPE_CONFIG_FORM_DICT = {
  login: LoginPageConfigForm,
  home: HomePageConfigForm
}

export const PORTAL_PAGES_TYPE_ENUM = {
  login: 'login',
  home: 'home'
}

export const PORTAL_PAGES_TYPE_TRANSLATION = {
  login: '登录页面',
  home: '门户页面'
}
