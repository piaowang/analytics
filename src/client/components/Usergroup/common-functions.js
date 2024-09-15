import _ from 'lodash'
export function update (target) {
  target.prototype.update = function(value, path) {
    let {modifier} = this.props
    let usergroup = _.cloneDeep(this.props.usergroup)
    _.set(usergroup, path, value)
    modifier({
      usergroup
    })
  }
}
