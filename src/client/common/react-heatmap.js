!function (e, t) {
  "object" == typeof exports && "object" == typeof module ? module.exports = t(require("heatmap.js"), require("react"), require("react-dom")) : "function" == typeof define && define.amd ? define("ReactHeatmap", ["heatmap.js", "react", "react-dom"], t) : "object" == typeof exports ? exports.ReactHeatmap = t(require("heatmap.js"), require("react"), require("react-dom")) : e.ReactHeatmap = t(e["heatmap.js"], e.react, e["react-dom"])
}(this, function (e, t, r) {
  return function (e) {
    function t(n) {
      if (r[n])
        return r[n].exports;
      var o = r[n] = {
        i: n,
        l: !1,
        exports: {}
      };
      return e[n].call(o.exports, o, o.exports, t),
        o.l = !0,
        o.exports
    }
    var r = {};
    return t.m = e,
      t.c = r,
      t.i = function (e) {
        return e
      }
      ,
      t.d = function (e, r, n) {
        t.o(e, r) || Object.defineProperty(e, r, {
          configurable: !1,
          enumerable: !0,
          get: n
        })
      }
      ,
      t.n = function (e) {
        var r = e && e.__esModule ? function () {
          return e.default
        }
          : function () {
            return e
          }
          ;
        return t.d(r, "a", r),
          r
      }
      ,
      t.o = function (e, t) {
        return Object.prototype.hasOwnProperty.call(e, t)
      }
      ,
      t.p = "",
      t(t.s = 3)
  }([function (t, r) {
    t.exports = e
  }
    , function (e, r) {
      e.exports = t
    }
    , function (e, t) {
      e.exports = r
    }
    , function (e, t, r) {
      "use strict";
      function n(e) {
        return e && e.__esModule ? e : {
          default: e
        }
      }
      function o(e, t) {
        if (!(e instanceof t))
          throw new TypeError("Cannot call a class as a function")
      }
      function a(e, t) {
        if (!e)
          throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
        return !t || "object" != typeof t && "function" != typeof t ? e : t
      }
      function u(e, t) {
        if ("function" != typeof t && null !== t)
          throw new TypeError("Super expression must either be null or a function, not " + typeof t);
        e.prototype = Object.create(t && t.prototype, {
          constructor: {
            value: e,
            enumerable: !1,
            writable: !0,
            configurable: !0
          }
        }),
          t && (Object.setPrototypeOf ? Object.setPrototypeOf(e, t) : e.__proto__ = t)
      }
      Object.defineProperty(t, "__esModule", {
        value: !0
      });
      var i = function () {
        function e(e, t) {
          for (var r = 0; r < t.length; r++) {
            var n = t[r];
            n.enumerable = n.enumerable || !1,
              n.configurable = !0,
              "value" in n && (n.writable = !0),
              Object.defineProperty(e, n.key, n)
          }
        }
        return function (t, r, n) {
          return r && e(t.prototype, r),
            n && e(t, n),
            t
        }
      }()
        , c = r(1)
        , p = n(c)
        , f = r(2)
        , s = n(f)
        , l = r(0)
        , d = n(l)
        , m = function (e) {
          function t() {
            var e, r, n, u;
            o(this, t);
            for (var i = arguments.length, c = Array(i), p = 0; p < i; p++)
              c[p] = arguments[p];
            return r = n = a(this, (e = t.__proto__ || Object.getPrototypeOf(t)).call.apply(e, [this].concat(c))),
              n.setData = function (e, t, r) {
                n.heatmap.setData({
                  min: e,
                  max: t,
                  data: r
                })
              }
              ,
              u = r,
              a(n, u)
          }
          return u(t, e),
            i(t, [{
              key: "componentDidMount",
              value: function () {
                var e = Object.assign({
                  container: s.default.findDOMNode(this)
                }, this.props.configObject);
                this.heatmap = d.default.create(e),
                  this.setData(this.props.min, this.props.max, this.props.data)
              }
            }, {
              key: "componentWillReceiveProps",
              value: function (e) {
                this.setData(e.min, e.max, e.data)
              }
            }, {
              key: "render",
              value: function () {
                return p.default.createElement("div", {
                  style: {
                    width: "100%",
                    height: "100%"
                  }
                })
              }
            }]),
            t
        }(p.default.Component);
      m.propTypes = {
        max: 0,
        min: 0,
        data: [],
        configObject: {}
      },
        m.defaultProps = {
          max: 5,
          min: 0,
          data: [],
          configObject: {}
        },
        t.default = m
    }
  ])
});

//////////////////
// WEBPACK FOOTER
// ./node_modules/react-heatmap.js/lib/ReactHeatmap.min.js
// module id = 3168
// module chunks = 159 160 161
