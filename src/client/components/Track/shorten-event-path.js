export function getShortenEventPath (event) {
  const eventPath = event.event_path
  let shortEventPath = '' //默认赋值整个eventPath
  switch (event.event_path_type) {
    case 'h5' : {
      shortEventPath = JSON.parse(eventPath).path
      break
    }
    case 'android' : {
      let androidArray = JSON.parse(eventPath)
      shortEventPath = JSON.stringify(androidArray[androidArray.length - 1])
      break
    }
    default : //ios的版本拿全部
      shortEventPath = eventPath
  }
  return shortEventPath

}
