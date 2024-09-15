const base = {
  requireLogin: true,
  requirePermission: false,
  lib: 'controllers/loss-predict.controller',
  class: '用户运营',
  group: '流失预测',
  menusCate: ['产品实验室','智能运营', '流失预测']
}

const routes = [
  // 以下是训练模型相关的接口
  {
    method: 'get',
    path: '/models',
    title: '取得所有模型',
    func: 'getModels'
  }, {
    method: 'get',
    path: '/models/:modelId',
    title: '取得某个模型',
    func: 'getModels'
  }, {
    method: 'post',
    path: '/models',
    title: '创建流失预测模型',
    func: 'createModel',
    requirePermission: true
  }, {
    method: 'put',
    path: '/models/:modelId',
    title: '更新流失预测模型',
    func: 'updateModel',
    requirePermission: true
  }, {
    method: 'delete',
    path: '/models/:modelId',
    title: '删除流失预测模型',
    func: 'deleteModel',
    requirePermission: true
  }, {
    method: 'get',
    path: '/models/:modelId/run',
    title: '开始训练模型',
    func: 'doTrain'
  },
  // 以下是预测结果相关的接口
  {
    method: 'get',
    path: '/models/:modelId/predictions',
    title: '取得某个模型的所有预测结果',
    func: 'getPredictions'
  }, {
    method: 'get',
    path: '/models/:modelId/predictions/:predictionId',
    title: '取得某个模型的某个预测结果',
    func: 'getPredictions'
  }, {
    method: 'post',
    path: '/models/:modelId/predictions',
    title: '为某个模型创建预测结果',
    func: 'createPrediction'
  }, {
    method: 'put',
    path: '/models/:modelId/predictions/:predictionId',
    title: '修改某个预测结果',
    func: 'updatePrediction'
  }, {
    method: 'delete',
    path: '/models/:modelId/predictions/:predictionId',
    title: '删除某个预测结果',
    func: 'deletePrediction'
  }, {
    method: 'get',
    path: '/models/:modelId/predictions/:predictionId/run',
    title: '开始预测',
    func: 'doPredict'
  }
]

export default {
  routes: routes.map(r => ({
    ...base,
    ...r
  })),
  prefix: 'app/loss-predict'
}
