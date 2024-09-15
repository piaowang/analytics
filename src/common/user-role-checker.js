
export function checkAdmin(SugoRoles) {
  return _.some(SugoRoles, s => s.type === 'built-in')
}
