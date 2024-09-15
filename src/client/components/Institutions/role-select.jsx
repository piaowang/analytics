import React from 'react'
import _ from 'lodash'
import PropTypes from 'prop-types'
import { Button } from 'antd'

const RoleSelect = ({
  roles,
  value=[],
  onChange
}) => {
  const [selectKey, setSelectKey] = React.useState(value)
  React.useEffect(()=>{
    setSelectKey([...value])
  }, [value.length])


  const clickHandel = (e) => {
    const key = e.target.getAttribute('name')
    const set = new Set(selectKey)
    if (set.has(key)) {
      set.delete(key)
    } else {
      set.add(key)
    }
    setSelectKey([...set])
    onChange([...set])
  }
  
  return (
    <div>
      {
        roles.map(role => {
          let {id, name, description} = role
          let selected = _.includes(selectKey, id)
          let type = selected ? 'primary' : 'ghost'
          let title = `${name}${description ? ':' + description : ''}`
          return (
            <Button
              title={title}
              key={id}
              name={id}
              type={type}
              className="mw200 elli mg1b mg1r"
              onClick={clickHandel}
            >{name}</Button>
          )
        })
      }
    </div>)
}

RoleSelect.propTypes  = {
  roles: PropTypes.array,
  value: PropTypes.array,
  onChange: PropTypes.func
}

export default RoleSelect

