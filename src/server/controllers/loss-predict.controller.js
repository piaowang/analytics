import LossPredictModelSvc from '../services/loss-predict-model.service'
import LossPredictPredictionSvc from '../services/loss-predict-prediction.service'
import {returnResult, returnError} from '../utils/helper'

async function getModels(ctx) {
  let {modelId} = ctx.params
  let {user} = ctx.session
  let {company_id, id} = user

  if (modelId) {
    let model = await LossPredictModelSvc.queryOneWithFile({id: modelId, company_id})
    returnResult(ctx, model)
    return
  }

  let models = await LossPredictModelSvc.queryManyWithFile({company_id})
  returnResult(ctx, models)
}

async function createModel(ctx) {
  let {user} = ctx.session
  let {company_id} = user
  let model = ctx.q

  // 重名检查
  let sameNameModel = await LossPredictModelSvc.queryOneWithFile({name: model.name, company_id})
  if (sameNameModel) {
    returnError(ctx, '存在同名的流失预测分析，请修改名称再试')
    return
  }

  model.company_id = company_id
  let res = await LossPredictModelSvc.create(model)
  returnResult(ctx, res)
}

async function updateModel(ctx) {
  let {modelId} = ctx.params
  let model = ctx.q

  let {user} = ctx.session
  let {company_id} = user

  let res = await LossPredictModelSvc.updateById(modelId, company_id, model)
  returnResult(ctx, res)
}

async function deleteModel(ctx) {
  let {modelId} = ctx.params

  let {user} = ctx.session
  let {company_id} = user

  let res = await LossPredictModelSvc.deleteById(modelId, company_id)
  returnResult(ctx, res)
}

async function doTrain(ctx) {
  let {modelId} = ctx.params

  let {user} = ctx.session
  let {company_id} = user

  let res = await LossPredictModelSvc.trainModelById(modelId)
  await LossPredictModelSvc.updateById(modelId, company_id, {model_info: res})
  returnResult(ctx, res)
}

async function getPredictions(ctx) {
  let {modelId, predictionId} = ctx.params

  if (predictionId) {
    let res = await LossPredictPredictionSvc.queryOne({by_model_id: modelId, id: predictionId})
    returnResult(ctx, res)
  } else {
    let res = await LossPredictPredictionSvc.queryMany({by_model_id: modelId})
    returnResult(ctx, res)
  }
}

async function createPrediction(ctx) {
  let {user} = ctx.session
  let {company_id, id} = user
  let prediction = ctx.q

  let {saveAfterTest} = ctx.query

  prediction.company_id = company_id
  if (saveAfterTest) {
    // 创建预测前需要先运行一次训练，或将模型上传至服务器（暂不支持）TODO
    await LossPredictModelSvc.trainModelById(prediction.by_model_id)

    let res = await LossPredictPredictionSvc.runPrediction(prediction)
    prediction.prediction_info = res
  }
  let res = await LossPredictPredictionSvc.create(prediction)
  returnResult(ctx, res)
}

async function updatePrediction(ctx) {
  let {modelId, predictionId} = ctx.params
  let pObj = ctx.q

  let {user} = ctx.session
  let {company_id} = user

  let res = await LossPredictPredictionSvc.updateById(predictionId, company_id, pObj)
  returnResult(ctx, res)
}

async function deletePrediction(ctx) {
  let {modelId, predictionId} = ctx.params
  let {user} = ctx.session
  let {company_id} = user

  let res = await LossPredictPredictionSvc.deleteById(predictionId, company_id)
  returnResult(ctx, res)
}

async function doPredict(ctx) {
  let {user} = ctx.session
  let {company_id} = user

  let {modelId, predictionId} = ctx.params
  let predictionWillRun = await LossPredictPredictionSvc.queryOne({id: predictionId})
  let res = await LossPredictPredictionSvc.runPrediction(predictionWillRun)
  await LossPredictPredictionSvc.updateById(predictionId, company_id, {prediction_info: res})
  returnResult(ctx, res)
}

export default {
  getModels,
  createModel,
  updateModel,
  deleteModel,
  doTrain,
  getPredictions,
  createPrediction,
  updatePrediction,
  deletePrediction,
  doPredict
}
