import {returnResult, returnError} from '../utils/helper'
import DataAnalysisService from '../services/sugo-data-analysis.service'
import ProjectService from '../services/sugo-project.service'
import _ from 'lodash'
import config from '../config'
import tar from 'tar-stream'
import path from 'path'
import zlib from 'zlib'
import { readDir, readFile, statFile } from '../utils/fs-promise'
import {mapAwaitAll} from '../../common/sugo-utils'


async function downloadLogCollector(ctx) {
  const {appId} = ctx.params
  const { logDir, logFileRegex = '.*\\.log' } = ctx.q

  ctx.request.acceptsEncodings('gzip', 'deflate', 'identity')
  if (!appId || !logDir || !logFileRegex) {
    return returnError(ctx, '下载失败，请配置完整参数！')
  }

  let app = await DataAnalysisService.findOne(appId)
  if (app.success) {
    app = app.result
  }
  let proj = await ProjectService.findOne(app.project_id)
  if (proj.success) {
    proj = proj.result
  }

  let {grokPattern} = app.params

  let willMod = _.mapValues({
    'file.reader.log.dir': logDir,
    'file.reader.log.regex': logFileRegex,
    'file.reader.grok.expr': grokPattern,
    'writer.kafka.topic': proj.datasource_name,
    'kafka.bootstrap.servers': config.kafka.kafkaServerHost,
    'writer.class': 'io.sugo.collect.writer.gateway.GatewayWriter',
    'writer.gateway.api': `${config.site.collectGateway}/safe/post?locate=${proj.datasource_name}&token=${app.id}`,
    'parser.class': 'io.sugo.collect.parser.GrokParser',
    'reader.class': 'io.sugo.collect.reader.file.DefaultFileReader',
    'file.reader.grok.patterns.path': 'conf/all_patterns'
  }, val => {
    // unescape for java .properties
    let qVal = JSON.stringify(val)
    return qVal.substr(1, qVal.length - 2)
  })

  let pack = tar.pack()
  const copyDirToZip = async (tarDir, fileDir, fileUpdater = null) => {
    let arr = await readDir(fileDir)
    arr = arr.filter(filename => filename !== 'package.json' && filename !== '.npmignore')

    for (let filename of arr) {
      const fullname = path.join(fileDir, filename)
      const stat = await statFile(fullname)
      if (stat.isDirectory()) {
        const _tarDir = `${tarDir}/${filename}`
        pack.entry({ name: _tarDir, type: 'directory' })// 增加目录到tar
        await copyDirToZip(_tarDir, fullname, fileUpdater)
      } else if (stat.isFile()) {
        let mode = 644
        if (filename.endsWith('.sh') || filename.endsWith('.bat')) {// 脚本可执行权限
          mode = 755
        }
        let content = await readFile(fullname)
        if (fileUpdater) {
          content = fileUpdater(fullname, content)
        }
        pack.entry({ name: `${tarDir}/` + filename, mode: parseInt(`${mode}`, 8) }, content)//  增加文件到tar
      }
    }
  }

  // 添加目录文件到压缩包
  let propReg = /^([^=]+)=(.*)$/
  let fileUpdater = (path, buff) => {
    if (!_.endsWith(path, 'conf/collect.properties')) {
      return buff
    }
    // 添加界面输入参数到压缩包
    let lines = buff.toString('utf8').split(/\r?\n/).map(lineStr => {
      let m = lineStr.match(propReg)
      if (!m) {
        return lineStr
      }
      let [, propName] = m
      return (propName in willMod) ? `${propName}=${willMod[propName]}` : lineStr
    })
    let shouldAppendKeys = _.difference(_.keys(willMod), lines.map(l => (l.match(propReg) || [])[1]).filter(_.identity))
    return [...lines, shouldAppendKeys.map(propName => `${propName}=${willMod[propName]}`)].join('\n')
  }

  const logCollectorSourceDir = process.cwd() + '/node_modules/log-collector-npm'
  let logCollectorVersion = require(`${logCollectorSourceDir}/package.json`).version
  await copyDirToZip(`Sugo-C-${logCollectorVersion}`, logCollectorSourceDir, fileUpdater)

  // 合并 grok.js/patterns/* 的内容到 conf/all_patterns
  let patternFilesDirPath = process.cwd() + '/node_modules/grok.js/patterns'
  let patternFiles = await readDir(patternFilesDirPath)
  let mergedPatternFileContent = (await mapAwaitAll(patternFiles, async fileName => {
    const fullname = path.join(patternFilesDirPath, fileName)
    let buff = await readFile(fullname)
    return `\n\n# ${fileName}\n${buff.toString('utf8')}`
  })).join('\n')

  pack.entry({ name: `Sugo-C-${logCollectorVersion}/conf/all_patterns`, mode: parseInt(`${644}`, 8) }, mergedPatternFileContent)

  pack.finalize() //压缩完成

  const zipFileName = `Sugo-C-${logCollectorVersion}.tar.gz`

  ctx.set('Content-disposition', `attachment;filename=${zipFileName}`) //设置下载文件头
  ctx.body = pack.pipe(
    zlib.createGzip({ //gzip 压缩
      level: 6,
      memLevel: 6
    })
  )
}

export default {
  downloadLogCollector
}
