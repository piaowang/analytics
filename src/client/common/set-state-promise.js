//decorate class
export default function (target) {

  target.prototype.setStatePromise = function (obj) {
    return new Promise((resolve) => {
      this.setState(obj, resolve)
    })
  }

}
