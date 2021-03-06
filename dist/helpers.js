"use strict";

require("core-js/modules/es6.array.from");

require("core-js/modules/es6.regexp.to-string");

require("core-js/modules/es7.symbol.async-iterator");

require("core-js/modules/es6.symbol");

require("core-js/modules/web.dom.iterable");

require("core-js/modules/es6.object.assign");

require("core-js/modules/es7.array.includes");

require("core-js/modules/es6.promise");

require("core-js/modules/es6.regexp.replace");

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var path = require("path");

var url = require("url");

var fs = require("fs");

var promisify = require("util.promisify");

var color = require("tinycolor2");

var colors = require("colors");

var jsonxml = require("jsontoxml");

var sizeOf = require("image-size");

var Jimp = require("jimp");

var sharp = require("sharp");

var PLATFORM_OPTIONS = require("./config/platform-options.json");

module.exports = function (options) {
  function directory(path) {
    return path.substr(-1) === "/" ? path : `${path}/`;
  }

  function relative(path) {
    var relativeToPath = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
    return url.resolve(!relativeToPath && options.path && directory(options.path) || "", path);
  }

  function log(context, message) {
    if (options.logging) {
      var magenta = colors.magenta,
          green = colors.green,
          yellow = colors.yellow;
      message = message.replace(/ \d+(x\d+)?/g, function (item) {
        return magenta(item);
      });
      message = message.replace(/#([0-9a-f]{3}){1,2}/g, function (item) {
        return magenta(item);
      });
      console.log(`${green("[Favicons]")} ${yellow(context)}: ${message}...`);
    }
  }

  function parseColor(hex) {
    var _color$toRgb = color(hex).toRgb(),
        r = _color$toRgb.r,
        g = _color$toRgb.g,
        b = _color$toRgb.b,
        a = _color$toRgb.a;

    return Jimp.rgbaToInt(r, g, b, a * 255);
  }

  return {
    General: {
      source(src) {
        log("General:source", `Source type is ${typeof src}`);

        if (Buffer.isBuffer(src)) {
          try {
            return Promise.resolve([{
              size: sizeOf(src),
              file: src
            }]);
          } catch (error) {
            return Promise.reject(new Error("Invalid image buffer"));
          }
        } else if (typeof src === "string") {
          return promisify(fs.readFile)(src).then(this.source.bind(this));
        } else if (Array.isArray(src) && !src.some(Array.isArray)) {
          if (!src.length) {
            return Promise.reject(new Error("No source provided"));
          }

          return Promise.all(src.map(this.source.bind(this))).then(function (results) {
            var _ref;

            return (_ref = []).concat.apply(_ref, _toConsumableArray(results));
          });
        } else {
          return Promise.reject(new Error("Invalid source type provided"));
        }
      },

      preparePlatformOptions(platform) {
        var parameters = typeof options.icons[platform] === "object" ? options.icons[platform] : {};

        var _arr = Object.keys(parameters);

        for (var _i = 0; _i < _arr.length; _i++) {
          var key = _arr[_i];

          if (!(key in PLATFORM_OPTIONS) || !PLATFORM_OPTIONS[key].platforms.includes(platform)) {
            throw new Error(`Unsupported option '${key}' on platform '${platform}'`);
          }
        }

        var _arr2 = Object.keys(PLATFORM_OPTIONS);

        for (var _i2 = 0; _i2 < _arr2.length; _i2++) {
          var _key = _arr2[_i2];
          var platformOption = PLATFORM_OPTIONS[_key];
          var platforms = platformOption.platforms,
              defaultTo = platformOption.defaultTo;

          if (!(_key in parameters) && platforms.includes(platform)) {
            parameters[_key] = platform in platformOption ? platformOption[platform] : defaultTo;
          }
        }

        if (parameters.background === true) {
          parameters.background = options.background;
        }

        return parameters;
      }

    },
    HTML: {
      render(htmlTemplate) {
        return htmlTemplate(Object.assign({}, options, {
          relative
        }));
      }

    },
    Files: {
      create(properties, name, isHtml) {
        return new Promise(function (resolve, reject) {
          log("Files:create", `Creating file: ${name}`);

          if (name === "manifest.json") {
            properties.name = options.appName;
            properties.short_name = options.appShortName || options.appName;
            properties.description = options.appDescription;
            properties.dir = options.dir;
            properties.lang = options.lang;
            properties.display = options.display;
            properties.orientation = options.orientation;
            properties.scope = options.scope;
            properties.start_url = options.start_url;
            properties.background_color = options.background;
            properties.theme_color = options.theme_color;
            properties.icons.map(function (icon) {
              return icon.src = relative(icon.src, options.manifestRelativePaths);
            });
            properties = JSON.stringify(properties, null, 2);
          } else if (name === "manifest.webapp") {
            properties.version = options.version;
            properties.name = options.appName;
            properties.description = options.appDescription;
            properties.developer.name = options.developerName;
            properties.developer.url = options.developerURL;
            properties.icons = Object.keys(properties.icons).reduce(function (obj, key) {
              return Object.assign(obj, {
                [key]: relative(properties.icons[key], options.manifestRelativePaths)
              });
            }, {});
            properties = JSON.stringify(properties, null, 2);
          } else if (name === "browserconfig.xml") {
            properties[0].children[0].children[0].children.map(function (property) {
              if (property.name === "TileColor") {
                property.text = options.background;
              } else {
                property.attrs.src = relative(property.attrs.src, options.manifestRelativePaths);
              }
            });
            properties = jsonxml(properties, {
              prettyPrint: true,
              xmlHeader: true,
              indent: "  "
            });
          } else if (name === "yandex-browser-manifest.json") {
            properties.version = options.version;
            properties.api_version = 1;
            properties.layout.logo = relative(properties.layout.logo, options.manifestRelativePaths);
            properties.layout.color = options.background;
            properties = JSON.stringify(properties, null, 2);
          } else if (isHtml) {
            properties = properties.join("\n");
          } else {
            reject(`Unknown format of file ${name}.`);
          }

          resolve({
            name,
            contents: properties
          });
        });
      }

    },
    Images: {
      create(properties) {
        var _this = this;

        return new Promise(function (resolve, reject) {
          log("Image:create", `Creating empty ${properties.width}x${properties.height} canvas with ${properties.transparent ? "transparent" : properties.background} background`);
          _this.jimp = new Jimp(properties.width, properties.height, properties.transparent ? 0 : parseColor(properties.background), function (error, canvas) {
            return error ? reject(error) : resolve(canvas);
          });
        });
      },

      render(sourceset, properties, offset) {
        log("Image:render", `Find nearest icon to ${properties.width}x${properties.height} with offset ${offset}`);
        var width = properties.width - offset * 2;
        var height = properties.height - offset * 2;
        var svgSource = sourceset.find(function (source) {
          return source.size.type === "svg";
        });
        var promise = null;

        if (svgSource) {
          var background = {
            r: 0,
            g: 0,
            b: 0,
            alpha: 0
          };
          log("Image:render", `Rendering SVG to ${width}x${height}`);
          promise = sharp(svgSource.file).resize({
            background,
            width,
            height,
            fit: sharp.fit.inside
          }).toBuffer({
            resolveWithObject: true
          }).then(function (_ref2) {
            var data = _ref2.data,
                info = _ref2.info;
            return sharp(data).extend({
              background,
              top: height - info.height >> 1,
              bottom: height - info.height + 1 >> 1,
              left: width - info.width >> 1,
              right: width - info.width + 1 >> 1
            }).toBuffer().then(Jimp.read);
          });
        } else {
          var sideSize = Math.max(width, height);
          var nearestIcon = sourceset[0];
          var nearestSideSize = Math.max(nearestIcon.size.width, nearestIcon.size.height);
          var _iteratorNormalCompletion = true;
          var _didIteratorError = false;
          var _iteratorError = undefined;

          try {
            for (var _iterator = sourceset[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
              var icon = _step.value;
              var max = Math.max(icon.size.width, icon.size.height);

              if ((nearestSideSize > max || nearestSideSize < sideSize) && max >= sideSize) {
                nearestIcon = icon;
                nearestSideSize = max;
              }
            }
          } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
          } finally {
            try {
              if (!_iteratorNormalCompletion && _iterator.return != null) {
                _iterator.return();
              }
            } finally {
              if (_didIteratorError) {
                throw _iteratorError;
              }
            }
          }

          log("Images:render", `Resizing PNG to ${width}x${height}`);
          promise = Jimp.read(nearestIcon.file).then(function (image) {
            return image.contain(width, height, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE, options.pixel_art && width >= image.bitmap.width && height >= image.bitmap.height ? Jimp.RESIZE_NEAREST_NEIGHBOR : null);
          });
        }

        return promise.then(function (image) {
          return image;
        });
      },

      mask: Jimp.read(path.join(__dirname, "mask.png")),
      overlayGlow: Jimp.read(path.join(__dirname, "overlay-glow.png")),
      // Gimp drop shadow filter: input: mask.png, config: X: 2, Y: 5, Offset: 5, Color: black, Opacity: 20
      overlayShadow: Jimp.read(path.join(__dirname, "overlay-shadow.png")),

      composite(canvas, image, properties, offset, max) {
        var _this2 = this;

        if (properties.mask) {
          log("Images:composite", "Masking composite image on circle");
          return Promise.all([this.mask, this.overlayGlow, this.overlayShadow]).then(function (_ref3) {
            var _ref4 = _slicedToArray(_ref3, 3),
                mask = _ref4[0],
                glow = _ref4[1],
                shadow = _ref4[2];

            canvas.mask(mask.clone().resize(max, Jimp.AUTO), 0, 0);

            if (properties.overlayGlow) {
              canvas.composite(glow.clone().resize(max, Jimp.AUTO), 0, 0);
            }

            if (properties.overlayShadow) {
              canvas.composite(shadow.clone().resize(max, Jimp.AUTO), 0, 0);
            }

            properties = Object.assign({}, properties, {
              mask: false
            });
            return _this2.composite(canvas, image, properties, offset, max);
          });
        }

        log("Images:composite", `Compositing favicon on ${properties.width}x${properties.height} canvas with offset ${offset}`);
        return new Promise(function (resolve, reject) {
          canvas.composite(image, offset, offset);

          if (properties.rotate) {
            var degrees = 90;
            log("Images:render", `Rotating image by ${degrees}`);
            canvas.rotate(degrees, false);
          }

          return canvas.getBuffer(Jimp.MIME_PNG, function (error, result) {
            return error ? reject(error) : resolve(result);
          });
        });
      }

    }
  };
};