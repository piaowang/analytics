export let buildUrl = name => {
  return window.location.origin +
    '/_bc/sugo-analytics-static/assets/maps/' +
    name +
    '.json'
}
export const defaultMapName = 'china'
