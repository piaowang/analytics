import  { Transform } from 'stream'

export default class CSVOutputStream extends Transform {
  constructor (options = {}) {
    super(options)
    this.started = false
    this.attrs = []
  }

  get isHead () {
    return !this.started
  }

  head (attrs) {
    this.push(attrs.map(c => c.name).join(','))
    this.attrs = attrs
    this.started = false
  }

  body (data) {
    let datum = data.datum
    this.push(this.attrs.map(c => {
      let value = datum[c.name]
      // let fmtr = value != null ? (formatter[c.type] || DEFAULT_FORMATTER[c.type]) : (formatter['NULL'] || DEFAULT_FORMATTER['NULL'])
      // let formatted = String(fmtr(value, timezone));
      // let finalized = formatted && finalizer ? finalizer(formatted) : formatted
      return String(value)
    }).join(','))
  }

  footer () {
    this.push('\r\n')
    // end the stream
    this.push(null)
  }

  _transform (chunk, encoding, done) {
    console.log(chunk, ';chunk===')
    var data = chunk//.toString()
    this.isHead ? this.head(data) : this.body(data)
    done()
  }

  _flush (done) {
    this.footer()
    this._lastLineData = null
    done()
  }
}
