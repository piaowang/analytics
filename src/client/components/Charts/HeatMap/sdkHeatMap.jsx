import React from 'react'
import PropTypes from 'prop-types'
import _ from 'lodash'
import Fetch from '../../../common/fetch-final'
import ReactHeatmap from '../../../common/react-heatmap'
import './css.styl'
import { getHeatMapPointData, getHeatMapPointsAndPanel, HEATMAP_TYPE } from '../../../common/sdk-calc-point-position'
import { withSizeProvider } from '../../Common/size-provider'

@withSizeProvider
export default class SdkHeatMap extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      screenshot: ''
    }
  }
  static propTypes = {
    settings: PropTypes.object
  }
  componentWillMount() {
    const screenshotId = _.get(this.props, 'settings.screenshot_id', '')
    if (screenshotId) {
      this.getImg(screenshotId)
    }
  }

  async getImg(screenshotId) {
    const res = await Fetch.get('/app/sdk/get/event-screenshot-draft', { screenshot_id: screenshotId })
    if (res.result) {
      this.setState({ screenshot: res.result })
    }
  }

  render() {
    const { settings, data, spHeight, spWidth } = this.props
    const { screenshot } = this.state
    const { img_style } = settings
    let slace = spHeight > img_style.height ? 1 : spHeight / img_style.height
    const imgHeight = img_style.height * slace
    const imgWidth = img_style.width * slace
    let eventPoints = []
    let heatMapDivs = []
    let heatPoints = []
    const config = {
      radius: 10,
      maxOpacity: 0.5,
      minOpacity: 0,
      blur: 0.75
    }
    if (spHeight && data.length) {
      const { events = [], eventGroups = [], points = [], pointsGroups = [] } = getHeatMapPointData(data, settings)
      eventPoints = settings.viewMode === HEATMAP_TYPE.GRID ? _.concat(pointsGroups, points) : _.concat(events, eventGroups)
      const pointsData = getHeatMapPointsAndPanel(eventPoints, true, settings.viewMode === HEATMAP_TYPE.GRID ? 'heat' : 'events', imgWidth, imgHeight, slace)
      heatMapDivs = pointsData.heatMapDivs
      heatPoints = pointsData.heatPoints
    }
    return (<div className="height-100 width-100 aligncenter sdk-heat-map-chart overhide" >

      <div style={{ width: imgWidth, height: imgHeight, margin: 'auto', position: 'relative' }} >
        {
          heatPoints.length && spHeight
            ? <div style={{ zIndex: 1, position: 'absolute', top: '0px', width: imgWidth, height: imgHeight }}>
              <ReactHeatmap key={`heratmap-${spWidth + spHeight}`} configObject={config} max={(_.maxBy(heatPoints, p => p.value) || {}).value} min={0} data={heatPoints} />
            </div>
            : null
        }
        <img src={`data:image/png;base64,${screenshot}`} className="width-100" />
        {heatMapDivs}
      </div>
    </div>)
  }
}
