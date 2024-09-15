import { useState, useEffect } from 'react'
import { loadModules } from 'esri-loader'

const ToggleBasemap = (props) => {
  const [toggle, setToggle] = useState(null)
  useEffect(() => {
    loadModules(['esri/widgets/BasemapToggle']).then(([BasemapToggle]) => {
      let toggle = new BasemapToggle({
        view: props.view,
        nextBasemap: 'hybrid'
      })
      setToggle(toggle)
      props.view.ui.add(toggle, 'top-right')
    }).catch((err) => console.error(err))
    return function cleanup() {
      props.view.ui.remove(toggle)
    }
  }, [])
  return null
}

export default ToggleBasemap
