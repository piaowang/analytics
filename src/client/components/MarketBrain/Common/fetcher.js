import Fetch from 'client/common/fetch-final'

export async function fetchDimensions (datasourceId) {
  // this.props.changeUrl({
  //   id: undefined
  // })
  if (datasourceId) {
    return await Fetch.get('/app/dimension/get' + '/' + datasourceId )
  }
}

export async function fetchMeasures(datasourceId) {
  if (datasourceId) {
    return await Fetch.get('/app/measure/get' + '/' + datasourceId )
  }
}
