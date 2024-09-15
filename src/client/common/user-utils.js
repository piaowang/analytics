import _ from 'lodash'

export function isSuperUser(user = window.sugo.user) {
  return _.some(user.SugoRoles, r => r.type === 'built-in' && r.name === 'admin')
}
