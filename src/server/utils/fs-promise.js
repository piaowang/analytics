import fs from 'fs'
const readDir = function (...arg) {
  return new Promise((resolve, reject) => {
    fs.readdir(...arg, (err, content) => {
      if (err) reject(err)
      else resolve(content)
    })
  })
}

const readFile = function (...arg) {
  return new Promise((resolve, reject) => {
    fs.readFile(...arg, (err, content) => {
      if (err) reject(err)
      else resolve(content)
    })
  })
}

const statFile = function (...arg) {
  return new Promise((resolve, reject) => {
    fs.stat(...arg, (err, stats) => {
      if (err) reject(err)
      else resolve(stats)
    })
  })
}

const mkdir = function (...arg) {
  return new Promise((resolve, reject) => {
    fs.mkdir(...arg, (err, stats) => {
      if (err) reject(err)
      else resolve(stats)
    })
  })
}

const unlinkFile = function (...arg) {
  return new Promise((resolve, reject) => {
    fs.unlink(...arg, function (err) {
      if (err) return reject(err)
      else resolve('删除文件成功')
    })
  })
}

const existedFile = function (...arg) {
  return new Promise((resolve, reject) => {
    fs.exists(...arg, function (exist) {
      resolve(exist)
    })
  })
}

const rename = function (...arg) {
  return new Promise((resolve, reject) => {
    fs.rename(...arg, (err) => {
      if (err) return reject(err)
      else return resolve('重命名成功')
    })
  })
}

export {
  readDir,
  readFile,
  statFile,
  unlinkFile,
  mkdir,
  existedFile,
  rename
}
