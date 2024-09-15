import {
  creatApplication,
  creatAppTagrelation,
  createApptag, createTagOrder,
  deleteApplication,
  deleteAppTagrelation, deleteTagOrder, editTag,
  getAllApplication,
  getAllApptag,
  getAllAppTagrelation,
  getTagOrder,
  updateApplication,
  updateAppTagrelation,
  updateTagOrder
} from './queryhelper'
import _ from 'lodash'
import {sagaSyncModel} from '../../../Fetcher/saga-sync'
import {dictBy} from '../../../../../common/sugo-utils'

export const TAGS_SAGA_MODEL_NS = 'tags-saga-model'
export const TAG_ORDER_SAGA_MODEL_NS = 'tag-order-saga-model'
export const TAG_APP_ORDER_SAGA_MODEL_NS = 'tag-app-order-saga-model'
export const PORTAL_APPS_SAGA_MODEL_NS = 'portal-apps-saga-model'


export function makeTagTree(tagList, tagOrders) {
  const orderMap = dictBy(tagOrders, o => o.appTagId, v => v.order)
  const childGroupDict = _.groupBy(tagList, tag => tag.parentId || '')

  function findChildren(node) {
    if (!node) {
      return []
    }
    let childs = _.map(childGroupDict[node.id], tag => {
      return {
        ...tag,
        children: findChildren(tag)
      }
    })
    let orderDict = dictBy(orderMap[node.id], _.identity, (tId, idx) => idx)
    return _.orderBy(childs, tag => orderDict[tag.id] ?? 9999)
  }
  return findChildren({id: ''})
}

export const appTagSagaSyncModelGen = ns => props => {
  if (props.reuseSagaModel) {
    return null
  }
  let id = props?.match?.params?.id
  return sagaSyncModel({
    namespace: ns,
    modelName: 'applicationTags',
    reusable: true,
    getEffect: async () => {
      let res = await getAllApptag()
      const tagList = res?.tagList || []
      return tagList
      /*
      const tagListMap = _.keyBy(res?.tagList, 'id')
      const orderMap = dictBy(res?.order, o => o.appTagId, v => v.order)
      const tagAppOrder_tagId_map = dictBy(res?.tagAppOrder, tagAppOrder => tagAppOrder?.tagId, v => v?.appIdOrder)
      const order = res?.order || []
      const tagAppOrder = res?.tagAppOrder || []
      const tree = makeTagTree(tagList, res?.order)

      return {
        tree,
        order,
        tagList,
        tagListMap,
        orderMap,
        tagAppOrder,
        tagAppOrder_tagId_map
      }
*/
    },
    postEffect: async (model) => {
      await createApptag(model)
    },
    putEffect: async model => {
      return await editTag(model)
    },
    deleteEffect: async model => {
    }
  })
}

export const appTagOrderSagaSyncModelGen = ns => props => {
  return sagaSyncModel({
    namespace: ns,
    modelName: 'tagAppOrders',
    reusable: true,
    getEffect: async (model) => {
      let res = await getAllApptag()
      return res?.tagAppOrder || []
    },
    postEffect: async model => {
    },
    putEffect: async model => {
      // return await updateTagOrder(model)
    },
    deleteEffect: async model => {
    }
  })
}

export const portalTagOrderSagaSyncModelGen = ns => props => {
  return sagaSyncModel({
    namespace: ns,
    modelName: 'tagOrders',
    getEffect: async (model) => {
      let result = await getTagOrder()
      if (!_.some(result, tag => !tag.appTagId)) {
        // 没有根排序记录行，则自动创建
        return [{appTagId: null, order: []}, ...(result || [])]
      }
      return result
    },
    postEffect: async model => {
      return await createTagOrder(model)
    },
    putEffect: async model => {
      return await updateTagOrder(model)
    },
    deleteEffect: async model => {
      return await deleteTagOrder(model)
    }
  })
}

export const applicationSagaSyncModelGen = ns => props => {
  let id = props?.match?.params?.id
  return sagaSyncModel({
    namespace: ns,
    modelName: 'applications',
    reusable: true,
    getEffect: async (model) => {
      let result = await getAllApplication()
      let appPermissions = window?.sugo?.user?.appsPermissions
      if (appPermissions[0] !== 'all') {
        result = result.filter( i => appPermissions.includes(i.id))
      }
      return result
    },
    postEffect: async (model) => {
      return await creatApplication(model)
    },
    putEffect: async model => {
      return await updateApplication(model)
      //return await Fetch.put(`/app/data-apis/${model.id}`, model)
    },
    deleteEffect: async model => {
      return await deleteApplication(model)
      //return await Fetch.delete(`/app/data-apis/${model.id}`)
    }
  })
}


export const appTagRelationSagaSyncModelGen = ns => props => {
  if (props.reuseSagaModel) {
    return null
  }
  let id = props?.match?.params?.id
  return sagaSyncModel({
    namespace: ns,
    modelName: 'appTagRelation',
    getEffect: async () => {
      return await getAllAppTagrelation()
      // return id ? await getDataSources({id}) : await getDataSources()
    },
    postEffect: async (model) => {
      return await creatAppTagrelation(model)
    },
    putEffect: async model => {
      return await updateAppTagrelation(model)
      //return await Fetch.put(`/app/data-apis/${model.id}`, model)
    },
    deleteEffect: async model => {
      return await deleteAppTagrelation(model)
      //return await Fetch.delete(`/app/data-apis/${model.id}`)
    }
  })
}
