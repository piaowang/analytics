import { getAllApplication, getAllApptag } from './queryhelper'
import { sagaSyncModel } from '../../../Fetcher/saga-sync'

export const applicationSagaSyncModelGen = ns => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel({
    namespace: ns,
    modelName: 'application',
    getEffect: async (model) => {
      let result = await getAllApplication()
      let appPermissions = window.sugo.user.appsPermissions
      if (appPermissions[0] !== 'all') {
        result = result.filter( i => appPermissions.includes(i.id))
      }
      return result
      // return id ? await getDataSources({id}) : await getDataSources()
    }
  })
}

export const appTagSagaSyncModelGen = ns => props => {
  if (props.reuseSagaModel) {
    return null
  }
  return sagaSyncModel({
    namespace: ns,
    modelName: 'applicationTag',
    getEffect: async () => {
      let res = await getAllApptag()

      const tagListMap = {} 
      const orderMap = {}
      const tagAppOrder_tagId_map = {}

      const order = (res.order || []).map( i => {
        if (!orderMap[i.appTagId]) orderMap[i.appTagId] = i.order
        return i
      })

      const tagList = (res.tagList || []).map( i => {
        if (!tagListMap[i.id]) tagListMap[i.id] = i
        return i
      })

      const tagAppOrder = (res.tagAppOrder || []).map( i => {
        if (!tagAppOrder_tagId_map[i.extappTagId]) tagAppOrder_tagId_map[i.extappTagId] = i.appIdOrder
        return i
      })


      const tree = tagList.map( i => {
        if (!i.parentId) {
          i.children = findChildren(i)
          return i
        }
        return ''
      }).filter(_.identity)
      
      function findChildren(node) {
        return (orderMap[node.id] || []).map( i => {
          if (!orderMap[i]) return tagListMap[i]

          return {
            id: i,
            name: tagListMap[i].name,
            children: findChildren(tagListMap[i])
          }
        })
      }

      return {
        tree,
        order,
        tagList,
        tagListMap,
        orderMap,
        tagAppOrder,
        tagAppOrder_tagId_map
      }
    }
  })
}
