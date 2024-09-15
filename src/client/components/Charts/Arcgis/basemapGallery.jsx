import { useState, useEffect } from 'react'
import { loadModules } from 'esri-loader'

const BasemapGallery = (props) => {
  const [bgExpand, setBgExpand] = useState(null)
  useEffect(() => {
    loadModules(['esri/widgets/BasemapGallery', 'esri/widgets/Expand']).then(([BasemapGallery, Expand]) => {
      let basemapGallery = new BasemapGallery({
        view: props.view,
        source: {
          portal: {
            url: 'http://www.arcgis.com',
            useVectorBasemaps: true // Load vector tile basemap group
          }
        } 
      })
      //展开功能
      let bgExpand = new Expand({
        view: props.view,
        content: basemapGallery
      })
      basemapGallery.watch('activeBasemap', function() {
        let mobileSize =
                  props.view.heightBreakpoint === 'xsmall' ||
                  props.view.widthBreakpoint === 'xsmall'
        if (mobileSize) {
          bgExpand.collapse()
        }
      })
      setBgExpand(bgExpand)
      props.view.ui.add(bgExpand, 'top-right')
    }).catch((err) => console.error(err))
    return function cleanup() {
      props.view.ui.remove(bgExpand)
    }
  }, [])
  return null

}

export default BasemapGallery
