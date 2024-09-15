import { useState, useEffect } from 'react'
import { loadModules } from 'esri-loader'

const Searching = (props) => {
  const [searchWidget, setSearchWidget] = useState(null)
  useEffect(() => {
    props.view.ui.empty('top-right')
    loadModules(['esri/widgets/Search']).then(([Search]) => {
      let searchWidget = new Search({
        view: props.view
      })
      setSearchWidget(searchWidget)
      props.showSearch 
        ? props.view.ui.add(searchWidget, 'top-right')
        : props.view.ui.remove(searchWidget)
    }).catch((err) => console.error(err))
    return function cleanup() {
      props.view.ui.remove(searchWidget)
    }
  }, [])
  return null
}

export default Searching
