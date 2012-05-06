//"use strict"; 
var gl; 

//Copyright (c) 2009 The Chromium Authors. All rights reserved.
//Use of this source code is governed by a BSD-style license that can be
//found in the LICENSE file.

// Various functions for helping debug WebGL apps.

var WebGLDebugUtils = function() {

/**
 * Wrapped logging function.
 * @param {string} msg Message to log.
 */
var log = function(msg) {
  if (window.console && window.console.log) {
	throw msg; 
    window.console.log(msg);
  }
};

/**
 * Which arguements are enums.
 * @type {!Object.<number, string>}
 */
var glValidEnumContexts = {

  // Generic setters and getters

  'enable': { 0:true },
  'disable': { 0:true },
  'getParameter': { 0:true },

  // Rendering

  'drawArrays': { 0:true },
  'drawElements': { 0:true, 2:true },

  // Shaders

  'createShader': { 0:true },
  'getShaderParameter': { 1:true },
  'getProgramParameter': { 1:true },

  // Vertex attributes

  'getVertexAttrib': { 1:true },
  'vertexAttribPointer': { 2:true },

  // Textures

  'bindTexture': { 0:true },
  'activeTexture': { 0:true },
  'getTexParameter': { 0:true, 1:true },
  'texParameterf': { 0:true, 1:true },
  'texParameteri': { 0:true, 1:true, 2:true },
  'texImage2D': { 0:true, 2:true, 6:true, 7:true },
  'texSubImage2D': { 0:true, 6:true, 7:true },
  'copyTexImage2D': { 0:true, 2:true },
  'copyTexSubImage2D': { 0:true },
  'generateMipmap': { 0:true },

  // Buffer objects

  'bindBuffer': { 0:true },
  'bufferData': { 0:true, 2:true },
  'bufferSubData': { 0:true },
  'getBufferParameter': { 0:true, 1:true },

  // Renderbuffers and framebuffers

  'pixelStorei': { 0:true, 1:true },
  'readPixels': { 4:true, 5:true },
  'bindRenderbuffer': { 0:true },
  'bindFramebuffer': { 0:true },
  'checkFramebufferStatus': { 0:true },
  'framebufferRenderbuffer': { 0:true, 1:true, 2:true },
  'framebufferTexture2D': { 0:true, 1:true, 2:true },
  'getFramebufferAttachmentParameter': { 0:true, 1:true, 2:true },
  'getRenderbufferParameter': { 0:true, 1:true },
  'renderbufferStorage': { 0:true, 1:true },

  // Frame buffer operations (clear, blend, depth test, stencil)

  'clear': { 0:true },
  'depthFunc': { 0:true },
  'blendFunc': { 0:true, 1:true },
  'blendFuncSeparate': { 0:true, 1:true, 2:true, 3:true },
  'blendEquation': { 0:true },
  'blendEquationSeparate': { 0:true, 1:true },
  'stencilFunc': { 0:true },
  'stencilFuncSeparate': { 0:true, 1:true },
  'stencilMaskSeparate': { 0:true },
  'stencilOp': { 0:true, 1:true, 2:true },
  'stencilOpSeparate': { 0:true, 1:true, 2:true, 3:true },

  // Culling

  'cullFace': { 0:true },
  'frontFace': { 0:true },
};

/**
 * Map of numbers to names.
 * @type {Object}
 */
var glEnums = null;

/**
 * Initializes this module. Safe to call more than once.
 * @param {!WebGLRenderingContext} ctx A WebGL context. If
 *    you have more than one context it doesn't matter which one
 *    you pass in, it is only used to pull out constants.
 */
function init(ctx) {
  if (glEnums == null) {
    glEnums = { };
    for (var propertyName in ctx) {
      if (typeof ctx[propertyName] == 'number') {
        glEnums[ctx[propertyName]] = propertyName;
      }
    }
  }
}

/**
 * Checks the utils have been initialized.
 */
function checkInit() {
  if (glEnums == null) {
    throw 'WebGLDebugUtils.init(ctx) not called';
  }
}

/**
 * Returns true or false if value matches any WebGL enum
 * @param {*} value Value to check if it might be an enum.
 * @return {boolean} True if value matches one of the WebGL defined enums
 */
function mightBeEnum(value) {
  checkInit();
  return (glEnums[value] !== undefined);
}

/**
 * Gets an string version of an WebGL enum.
 *
 * Example:
 *   var str = WebGLDebugUtil.glEnumToString(ctx.getError());
 *
 * @param {number} value Value to return an enum for
 * @return {string} The string version of the enum.
 */
function glEnumToString(value) {
  checkInit();
  var name = glEnums[value];
  return (name !== undefined) ? name :
      ("*UNKNOWN WebGL ENUM (0x" + value.toString(16) + ")");
}

/**
 * Returns the string version of a WebGL argument.
 * Attempts to convert enum arguments to strings.
 * @param {string} functionName the name of the WebGL function.
 * @param {number} argumentIndx the index of the argument.
 * @param {*} value The value of the argument.
 * @return {string} The value as a string.
 */
function glFunctionArgToString(functionName, argumentIndex, value) {
  var funcInfo = glValidEnumContexts[functionName];
  if (funcInfo !== undefined) {
    if (funcInfo[argumentIndex]) {
      return glEnumToString(value);
    }
  }
  return value.toString();
}

function makePropertyWrapper(wrapper, original, propertyName) {
  //log("wrap prop: " + propertyName);
  wrapper.__defineGetter__(propertyName, function() {
    return original[propertyName];
  });
  // TODO(gmane): this needs to handle properties that take more than
  // one value?
  wrapper.__defineSetter__(propertyName, function(value) {
    //log("set: " + propertyName);
    original[propertyName] = value;
  });
}

// Makes a function that calls a function on another object.
function makeFunctionWrapper(original, functionName) {
  //log("wrap fn: " + functionName);
  var f = original[functionName];
  return function() {
    //log("call: " + functionName);
    var result = f.apply(original, arguments);
    return result;
  };
}

/**
 * Given a WebGL context returns a wrapped context that calls
 * gl.getError after every command and calls a function if the
 * result is not gl.NO_ERROR.
 *
 * @param {!WebGLRenderingContext} ctx The webgl context to
 *        wrap.
 * @param {!function(err, funcName, args): void} opt_onErrorFunc
 *        The function to call when gl.getError returns an
 *        error. If not specified the default function calls
 *        console.log with a message.
 */
function makeDebugContext(ctx, opt_onErrorFunc) {
  init(ctx);
  opt_onErrorFunc = opt_onErrorFunc || function(err, functionName, args) {
        // apparently we can't do args.join(",");
        var argStr = "";
        for (var ii = 0; ii < args.length; ++ii) {
          argStr += ((ii == 0) ? '' : ', ') +
              glFunctionArgToString(functionName, ii, args[ii]);
        }
        log("WebGL error "+ glEnumToString(err) + " in "+ functionName +
            "(" + argStr + ")");
      };

  // Holds booleans for each GL error so after we get the error ourselves
  // we can still return it to the client app.
  var glErrorShadow = { };

  // Makes a function that calls a WebGL function and then calls getError.
  function makeErrorWrapper(ctx, functionName) {
    return function() {
      var result = ctx[functionName].apply(ctx, arguments);
      var err = ctx.getError();
      if (err != 0) {
        glErrorShadow[err] = true;
        opt_onErrorFunc(err, functionName, arguments);
      }
      return result;
    };
  }

  // Make a an object that has a copy of every property of the WebGL context
  // but wraps all functions.
  var wrapper = {};
  for (var propertyName in ctx) {
    if (typeof ctx[propertyName] == 'function') {
       wrapper[propertyName] = makeErrorWrapper(ctx, propertyName);
     } else {
       makePropertyWrapper(wrapper, ctx, propertyName);
     }
  }

  // Override the getError function with one that returns our saved results.
  wrapper.getError = function() {
    for (var err in glErrorShadow) {
      if (glErrorShadow.hasOwnProperty(err)) {
        if (glErrorShadow[err]) {
          glErrorShadow[err] = false;
          return err;
        }
      }
    }
    return ctx.NO_ERROR;
  };

  return wrapper;
}

function resetToInitialState(ctx) {
  var numAttribs = ctx.getParameter(ctx.MAX_VERTEX_ATTRIBS);
  var tmp = ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER, tmp);
  for (var ii = 0; ii < numAttribs; ++ii) {
    ctx.disableVertexAttribArray(ii);
    ctx.vertexAttribPointer(ii, 4, ctx.FLOAT, false, 0, 0);
    ctx.vertexAttrib1f(ii, 0);
  }
  ctx.deleteBuffer(tmp);

  var numTextureUnits = ctx.getParameter(ctx.MAX_TEXTURE_IMAGE_UNITS);
  for (var ii = 0; ii < numTextureUnits; ++ii) {
    ctx.activeTexture(ctx.TEXTURE0 + ii);
    ctx.bindTexture(ctx.TEXTURE_CUBE_MAP, null);
    ctx.bindTexture(ctx.TEXTURE_2D, null);
  }

  ctx.activeTexture(ctx.TEXTURE0);
  ctx.useProgram(null);
  ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
  ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null);
  ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
  ctx.bindRenderbuffer(ctx.RENDERBUFFER, null);
  ctx.disable(ctx.BLEND);
  ctx.disable(ctx.CULL_FACE);
  ctx.disable(ctx.DEPTH_TEST);
  ctx.disable(ctx.DITHER);
  ctx.disable(ctx.SCISSOR_TEST);
  ctx.blendColor(0, 0, 0, 0);
  ctx.blendEquation(ctx.FUNC_ADD);
  ctx.blendFunc(ctx.ONE, ctx.ZERO);
  ctx.clearColor(0, 0, 0, 0);
  ctx.clearDepth(1);
  ctx.clearStencil(-1);
  ctx.colorMask(true, true, true, true);
  ctx.cullFace(ctx.BACK);
  ctx.depthFunc(ctx.LESS);
  ctx.depthMask(true);
  ctx.depthRange(0, 1);
  ctx.frontFace(ctx.CCW);
  ctx.hint(ctx.GENERATE_MIPMAP_HINT, ctx.DONT_CARE);
  ctx.lineWidth(1);
  ctx.pixelStorei(ctx.PACK_ALIGNMENT, 4);
  ctx.pixelStorei(ctx.UNPACK_ALIGNMENT, 4);
  ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, false);
  ctx.pixelStorei(ctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  // TODO: Delete this IF.
  if (ctx.UNPACK_COLORSPACE_CONVERSION_WEBGL) {
    ctx.pixelStorei(ctx.UNPACK_COLORSPACE_CONVERSION_WEBGL, ctx.BROWSER_DEFAULT_WEBGL);
  }
  ctx.polygonOffset(0, 0);
  ctx.sampleCoverage(1, false);
  ctx.scissor(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.stencilFunc(ctx.ALWAYS, 0, 0xFFFFFFFF);
  ctx.stencilMask(0xFFFFFFFF);
  ctx.stencilOp(ctx.KEEP, ctx.KEEP, ctx.KEEP);
  ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT | ctx.STENCIL_BUFFER_BIT);

  // TODO: This should NOT be needed but Firefox fails with 'hint'
  while(ctx.getError());
}

function makeLostContextSimulatingCanvas(canvas) {
  var unwrappedContext_;
  var wrappedContext_;
  var onLost_ = [];
  var onRestored_ = [];
  var wrappedContext_ = {};
  var contextId_ = 1;
  var contextLost_ = false;
  var resourceId_ = 0;
  var resourceDb_ = [];
  var numCallsToLoseContext_ = 0;
  var numCalls_ = 0;
  var canRestore_ = false;
  var restoreTimeout_ = 0;

  // Holds booleans for each GL error so can simulate errors.
  var glErrorShadow_ = { };

  canvas.getContext = function(f) {
    return function() {
      var ctx = f.apply(canvas, arguments);
      // Did we get a context and is it a WebGL context?
      if (ctx instanceof WebGLRenderingContext) {
        if (ctx != unwrappedContext_) {
          if (unwrappedContext_) {
            throw "got different context"
          }
          unwrappedContext_ = ctx;
          wrappedContext_ = makeLostContextSimulatingContext(unwrappedContext_);
        }
        return wrappedContext_;
      }
      return ctx;
    }
  }(canvas.getContext);

  function wrapEvent(listener) {
    if (typeof(listener) == "function") {
      return listener;
    } else {
      return function(info) {
        listener.handleEvent(info);
      }
    }
  }

  var addOnContextLostListener = function(listener) {
    onLost_.push(wrapEvent(listener));
  };

  var addOnContextRestoredListener = function(listener) {
    onRestored_.push(wrapEvent(listener));
  };


  function wrapAddEventListener(canvas) {
    var f = canvas.addEventListener;
    canvas.addEventListener = function(type, listener, bubble) {
      switch (type) {
        case 'webglcontextlost':
          addOnContextLostListener(listener);
          break;
        case 'webglcontextrestored':
          addOnContextRestoredListener(listener);
          break;
        default:
          f.apply(canvas, arguments);
      }
    };
  }

  wrapAddEventListener(canvas);

  canvas.loseContext = function() {
    if (!contextLost_) {
      contextLost_ = true;
      numCallsToLoseContext_ = 0;
      ++contextId_;
      while (unwrappedContext_.getError());
      clearErrors();
      glErrorShadow_[unwrappedContext_.CONTEXT_LOST_WEBGL] = true;
      var event = makeWebGLContextEvent("context lost");
      var callbacks = onLost_.slice();
      setTimeout(function() {
          //log("numCallbacks:" + callbacks.length);
          for (var ii = 0; ii < callbacks.length; ++ii) {
            //log("calling callback:" + ii);
            callbacks[ii](event);
          }
          if (restoreTimeout_ >= 0) {
            setTimeout(function() {
                canvas.restoreContext();
              }, restoreTimeout_);
          }
        }, 0);
    }
  };

  canvas.restoreContext = function() {
    if (contextLost_) {
      if (onRestored_.length) {
        setTimeout(function() {
            if (!canRestore_) {
              throw "can not restore. webglcontestlost listener did not call event.preventDefault";
            }
            freeResources();
            resetToInitialState(unwrappedContext_);
            contextLost_ = false;
            numCalls_ = 0;
            canRestore_ = false;
            var callbacks = onRestored_.slice();
            var event = makeWebGLContextEvent("context restored");
            for (var ii = 0; ii < callbacks.length; ++ii) {
              callbacks[ii](event);
            }
          }, 0);
      }
    }
  };

  canvas.loseContextInNCalls = function(numCalls) {
    if (contextLost_) {
      throw "You can not ask a lost contet to be lost";
    }
    numCallsToLoseContext_ = numCalls_ + numCalls;
  };

  canvas.getNumCalls = function() {
    return numCalls_;
  };

  canvas.setRestoreTimeout = function(timeout) {
    restoreTimeout_ = timeout;
  };

  function isWebGLObject(obj) {
    //return false;
    return (obj instanceof WebGLBuffer ||
            obj instanceof WebGLFramebuffer ||
            obj instanceof WebGLProgram ||
            obj instanceof WebGLRenderbuffer ||
            obj instanceof WebGLShader ||
            obj instanceof WebGLTexture);
  }

  function checkResources(args) {
    for (var ii = 0; ii < args.length; ++ii) {
      var arg = args[ii];
      if (isWebGLObject(arg)) {
        return arg.__webglDebugContextLostId__ == contextId_;
      }
    }
    return true;
  }

  function clearErrors() {
    var k = Object.keys(glErrorShadow_);
    for (var ii = 0; ii < k.length; ++ii) {
      delete glErrorShadow_[k];
    }
  }

  function loseContextIfTime() {
    ++numCalls_;
    if (!contextLost_) {
      if (numCallsToLoseContext_ == numCalls_) {
        canvas.loseContext();
      }
    }
  }

  // Makes a function that simulates WebGL when out of context.
  function makeLostContextFunctionWrapper(ctx, functionName) {
    var f = ctx[functionName];
    return function() {
      // log("calling:" + functionName);
      // Only call the functions if the context is not lost.
      loseContextIfTime();
      if (!contextLost_) {
        //if (!checkResources(arguments)) {
        //  glErrorShadow_[wrappedContext_.INVALID_OPERATION] = true;
        //  return;
        //}
        var result = f.apply(ctx, arguments);
        return result;
      }
    };
  }

  function freeResources() {
    for (var ii = 0; ii < resourceDb_.length; ++ii) {
      var resource = resourceDb_[ii];
      if (resource instanceof WebGLBuffer) {
        unwrappedContext_.deleteBuffer(resource);
      } else if (resource instanceof WebGLFramebuffer) {
        unwrappedContext_.deleteFramebuffer(resource);
      } else if (resource instanceof WebGLProgram) {
        unwrappedContext_.deleteProgram(resource);
      } else if (resource instanceof WebGLRenderbuffer) {
        unwrappedContext_.deleteRenderbuffer(resource);
      } else if (resource instanceof WebGLShader) {
        unwrappedContext_.deleteShader(resource);
      } else if (resource instanceof WebGLTexture) {
        unwrappedContext_.deleteTexture(resource);
      }
    }
  }

  function makeWebGLContextEvent(statusMessage) {
    return {
      statusMessage: statusMessage,
      preventDefault: function() {
          canRestore_ = true;
        }
    };
  }

  return canvas;

  function makeLostContextSimulatingContext(ctx) {
    // copy all functions and properties to wrapper
    for (var propertyName in ctx) {
      if (typeof ctx[propertyName] == 'function') {
         wrappedContext_[propertyName] = makeLostContextFunctionWrapper(
             ctx, propertyName);
       } else {
         makePropertyWrapper(wrappedContext_, ctx, propertyName);
       }
    }

    // Wrap a few functions specially.
    wrappedContext_.getError = function() {
      loseContextIfTime();
      if (!contextLost_) {
        var err;
        while (err = unwrappedContext_.getError()) {
          glErrorShadow_[err] = true;
        }
      }
      for (var err in glErrorShadow_) {
        if (glErrorShadow_[err]) {
          delete glErrorShadow_[err];
          return err;
        }
      }
      return wrappedContext_.NO_ERROR;
    };

    var creationFunctions = [
      "createBuffer",
      "createFramebuffer",
      "createProgram",
      "createRenderbuffer",
      "createShader",
      "createTexture"
    ];
    for (var ii = 0; ii < creationFunctions.length; ++ii) {
      var functionName = creationFunctions[ii];
      wrappedContext_[functionName] = function(f) {
        return function() {
          loseContextIfTime();
          if (contextLost_) {
            return null;
          }
          var obj = f.apply(ctx, arguments);
          obj.__webglDebugContextLostId__ = contextId_;
          resourceDb_.push(obj);
          return obj;
        };
      }(ctx[functionName]);
    }

    var functionsThatShouldReturnNull = [
      "getActiveAttrib",
      "getActiveUniform",
      "getBufferParameter",
      "getContextAttributes",
      "getAttachedShaders",
      "getFramebufferAttachmentParameter",
      "getParameter",
      "getProgramParameter",
      "getProgramInfoLog",
      "getRenderbufferParameter",
      "getShaderParameter",
      "getShaderInfoLog",
      "getShaderSource",
      "getTexParameter",
      "getUniform",
      "getUniformLocation",
      "getVertexAttrib"
    ];
    for (var ii = 0; ii < functionsThatShouldReturnNull.length; ++ii) {
      var functionName = functionsThatShouldReturnNull[ii];
      wrappedContext_[functionName] = function(f) {
        return function() {
          loseContextIfTime();
          if (contextLost_) {
            return null;
          }
          return f.apply(ctx, arguments);
        }
      }(wrappedContext_[functionName]);
    }

    var isFunctions = [
      "isBuffer",
      "isEnabled",
      "isFramebuffer",
      "isProgram",
      "isRenderbuffer",
      "isShader",
      "isTexture"
    ];
    for (var ii = 0; ii < isFunctions.length; ++ii) {
      var functionName = isFunctions[ii];
      wrappedContext_[functionName] = function(f) {
        return function() {
          loseContextIfTime();
          if (contextLost_) {
            return false;
          }
          return f.apply(ctx, arguments);
        }
      }(wrappedContext_[functionName]);
    }

    wrappedContext_.checkFramebufferStatus = function(f) {
      return function() {
        loseContextIfTime();
        if (contextLost_) {
          return wrappedContext_.FRAMEBUFFER_UNSUPPORTED;
        }
        return f.apply(ctx, arguments);
      };
    }(wrappedContext_.checkFramebufferStatus);

    wrappedContext_.getAttribLocation = function(f) {
      return function() {
        loseContextIfTime();
        if (contextLost_) {
          return -1;
        }
        return f.apply(ctx, arguments);
      };
    }(wrappedContext_.getAttribLocation);

    wrappedContext_.getVertexAttribOffset = function(f) {
      return function() {
        loseContextIfTime();
        if (contextLost_) {
          return 0;
        }
        return f.apply(ctx, arguments);
      };
    }(wrappedContext_.getVertexAttribOffset);

    wrappedContext_.isContextLost = function() {
      return contextLost_;
    };

    return wrappedContext_;
  }
}

return {
    /**
     * Initializes this module. Safe to call more than once.
     * @param {!WebGLRenderingContext} ctx A WebGL context. If
    }
   *    you have more than one context it doesn't matter which one
   *    you pass in, it is only used to pull out constants.
   */
  'init': init,

  /**
   * Returns true or false if value matches any WebGL enum
   * @param {*} value Value to check if it might be an enum.
   * @return {boolean} True if value matches one of the WebGL defined enums
   */
  'mightBeEnum': mightBeEnum,

  /**
   * Gets an string version of an WebGL enum.
   *
   * Example:
   *   WebGLDebugUtil.init(ctx);
   *   var str = WebGLDebugUtil.glEnumToString(ctx.getError());
   *
   * @param {number} value Value to return an enum for
   * @return {string} The string version of the enum.
   */
  'glEnumToString': glEnumToString,

  /**
   * Converts the argument of a WebGL function to a string.
   * Attempts to convert enum arguments to strings.
   *
   * Example:
   *   WebGLDebugUtil.init(ctx);
   *   var str = WebGLDebugUtil.glFunctionArgToString('bindTexture', 0, gl.TEXTURE_2D);
   *
   * would return 'TEXTURE_2D'
   *
   * @param {string} functionName the name of the WebGL function.
   * @param {number} argumentIndx the index of the argument.
   * @param {*} value The value of the argument.
   * @return {string} The value as a string.
   */
  'glFunctionArgToString': glFunctionArgToString,

  /**
   * Given a WebGL context returns a wrapped context that calls
   * gl.getError after every command and calls a function if the
   * result is not NO_ERROR.
   *
   * You can supply your own function if you want. For example, if you'd like
   * an exception thrown on any GL error you could do this
   *
   *    function throwOnGLError(err, funcName, args) {
   *      throw WebGLDebugUtils.glEnumToString(err) +
   *            " was caused by call to " + funcName;
   *    };
   *
   *    ctx = WebGLDebugUtils.makeDebugContext(
   *        canvas.getContext("webgl"), throwOnGLError);
   *
   * @param {!WebGLRenderingContext} ctx The webgl context to wrap.
   * @param {!function(err, funcName, args): void} opt_onErrorFunc The function
   *     to call when gl.getError returns an error. If not specified the default
   *     function calls console.log with a message.
   */
  'makeDebugContext': makeDebugContext,

  /**
   * Given a canvas element returns a wrapped canvas element that will
   * simulate lost context. The canvas returned adds the following functions.
   *
   * loseContext:
   *   simulates a lost context event.
   *
   * restoreContext:
   *   simulates the context being restored.
   *
   * lostContextInNCalls:
   *   loses the context after N gl calls.
   *
   * getNumCalls:
   *   tells you how many gl calls there have been so far.
   *
   * setRestoreTimeout:
   *   sets the number of milliseconds until the context is restored
   *   after it has been lost. Defaults to 0. Pass -1 to prevent
   *   automatic restoring.
   *
   * @param {!Canvas} canvas The canvas element to wrap.
   */
  'makeLostContextSimulatingCanvas': makeLostContextSimulatingCanvas,

  /**
   * Resets a context to the initial state.
   * @param {!WebGLRenderingContext} ctx The webgl context to
   *     reset.
   */
  'resetToInitialState': resetToInitialState
};

}();



// gl-matrix 1.3.1 - https://github.com/toji/gl-matrix/blob/master/LICENSE.md
(function(n,D){"object"===typeof exports?module.exports=D(global):"function"===typeof define&&define.amd?define([],function(){return D(n)}):D(n)})(this,function(n){function D(a){return s=a}function K(){return s="undefined"!==typeof Float32Array?Float32Array:Array}var E={};(function(){if("undefined"!=typeof Float32Array){var a=new Float32Array(1),b=new Int32Array(a.buffer);E.invsqrt=function(c){a[0]=c;b[0]=1597463007-(b[0]>>1);var d=a[0];return d*(1.5-0.5*c*d*d)}}else E.invsqrt=function(a){return 1/
Math.sqrt(a)}})();var s=null;K();var r={create:function(a){var b=new s(3);a?(b[0]=a[0],b[1]=a[1],b[2]=a[2]):b[0]=b[1]=b[2]=0;return b},set:function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];return b},add:function(a,b,c){if(!c||a===c)return a[0]+=b[0],a[1]+=b[1],a[2]+=b[2],a;c[0]=a[0]+b[0];c[1]=a[1]+b[1];c[2]=a[2]+b[2];return c},subtract:function(a,b,c){if(!c||a===c)return a[0]-=b[0],a[1]-=b[1],a[2]-=b[2],a;c[0]=a[0]-b[0];c[1]=a[1]-b[1];c[2]=a[2]-b[2];return c},multiply:function(a,b,c){if(!c||a===c)return a[0]*=
b[0],a[1]*=b[1],a[2]*=b[2],a;c[0]=a[0]*b[0];c[1]=a[1]*b[1];c[2]=a[2]*b[2];return c},negate:function(a,b){b||(b=a);b[0]=-a[0];b[1]=-a[1];b[2]=-a[2];return b},scale:function(a,b,c){if(!c||a===c)return a[0]*=b,a[1]*=b,a[2]*=b,a;c[0]=a[0]*b;c[1]=a[1]*b;c[2]=a[2]*b;return c},normalize:function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=Math.sqrt(c*c+d*d+e*e);if(!g)return b[0]=0,b[1]=0,b[2]=0,b;if(1===g)return b[0]=c,b[1]=d,b[2]=e,b;g=1/g;b[0]=c*g;b[1]=d*g;b[2]=e*g;return b},cross:function(a,b,c){c||(c=a);
var d=a[0],e=a[1],a=a[2],g=b[0],f=b[1],b=b[2];c[0]=e*b-a*f;c[1]=a*g-d*b;c[2]=d*f-e*g;return c},length:function(a){var b=a[0],c=a[1],a=a[2];return Math.sqrt(b*b+c*c+a*a)},dot:function(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]},direction:function(a,b,c){c||(c=a);var d=a[0]-b[0],e=a[1]-b[1],a=a[2]-b[2],b=Math.sqrt(d*d+e*e+a*a);if(!b)return c[0]=0,c[1]=0,c[2]=0,c;b=1/b;c[0]=d*b;c[1]=e*b;c[2]=a*b;return c},lerp:function(a,b,c,d){d||(d=a);d[0]=a[0]+c*(b[0]-a[0]);d[1]=a[1]+c*(b[1]-a[1]);d[2]=a[2]+c*(b[2]-
a[2]);return d},dist:function(a,b){var c=b[0]-a[0],d=b[1]-a[1],e=b[2]-a[2];return Math.sqrt(c*c+d*d+e*e)}},L=null,t=new s(4);r.unproject=function(a,b,c,d,e){e||(e=a);L||(L=p.create());var g=L;t[0]=2*(a[0]-d[0])/d[2]-1;t[1]=2*(a[1]-d[1])/d[3]-1;t[2]=2*a[2]-1;t[3]=1;p.multiply(c,b,g);if(!p.inverse(g))return null;p.multiplyVec4(g,t);if(0===t[3])return null;e[0]=t[0]/t[3];e[1]=t[1]/t[3];e[2]=t[2]/t[3];return e};var O=r.create([1,0,0]),P=r.create([0,1,0]),Q=r.create([0,0,1]);r.rotationTo=function(a,b,
c){c||(c=h.create());var d=r.dot(a,b),e=r.create();if(1<=d)h.set(R,c);else if(-0.999999>d)r.cross(O,a,e),1.0E-6>e.length&&r.cross(P,a,e),1.0E-6>e.length&&r.cross(Q,a,e),r.normalize(e),h.fromAxisAngle(e,Math.PI,c);else{var d=Math.sqrt(2*(1+d)),g=1/d;r.cross(a,b,e);c[0]=e[0]*g;c[1]=e[1]*g;c[2]=e[2]*g;c[3]=0.5*d;h.normalize(c)}1<c[3]?c[3]=1:-1>c[3]&&(c[3]=-1);return c};r.str=function(a){return"["+a[0]+", "+a[1]+", "+a[2]+"]"};var C={create:function(a){var b=new s(9);a&&(b[0]=a[0],b[1]=a[1],b[2]=a[2],
b[3]=a[3],b[4]=a[4],b[5]=a[5],b[6]=a[6],b[7]=a[7],b[8]=a[8]);return b},multiplyVec2:function(a,b,c){c||(c=b);var d=b[0],b=b[1];c[0]=d*a[0]+b*a[3]+a[6];c[1]=d*a[1]+b*a[4]+a[7];return c},multiplyVec3:function(a,b,c){c||(c=b);var d=b[0],e=b[1],b=b[2];c[0]=d*a[0]+e*a[3]+b*a[6];c[1]=d*a[1]+e*a[4]+b*a[7];c[2]=d*a[2]+e*a[5]+b*a[8];return c},set:function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];return b},identity:function(a){a||(a=C.create());a[0]=1;a[1]=
0;a[2]=0;a[3]=0;a[4]=1;a[5]=0;a[6]=0;a[7]=0;a[8]=1;return a},transpose:function(a,b){if(!b||a===b){var c=a[1],d=a[2],e=a[5];a[1]=a[3];a[2]=a[6];a[3]=c;a[5]=a[7];a[6]=d;a[7]=e;return a}b[0]=a[0];b[1]=a[3];b[2]=a[6];b[3]=a[1];b[4]=a[4];b[5]=a[7];b[6]=a[2];b[7]=a[5];b[8]=a[8];return b},toMat4:function(a,b){b||(b=p.create());b[15]=1;b[14]=0;b[13]=0;b[12]=0;b[11]=0;b[10]=a[8];b[9]=a[7];b[8]=a[6];b[7]=0;b[6]=a[5];b[5]=a[4];b[4]=a[3];b[3]=0;b[2]=a[2];b[1]=a[1];b[0]=a[0];return b},str:function(a){return"["+
a[0]+", "+a[1]+", "+a[2]+", "+a[3]+", "+a[4]+", "+a[5]+", "+a[6]+", "+a[7]+", "+a[8]+"]"}},p={create:function(a){var b=new s(16);a&&(b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3],b[4]=a[4],b[5]=a[5],b[6]=a[6],b[7]=a[7],b[8]=a[8],b[9]=a[9],b[10]=a[10],b[11]=a[11],b[12]=a[12],b[13]=a[13],b[14]=a[14],b[15]=a[15]);return b},set:function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];b[9]=a[9];b[10]=a[10];b[11]=a[11];b[12]=a[12];b[13]=a[13];b[14]=a[14];b[15]=a[15];
return b},identity:function(a){a||(a=p.create());a[0]=1;a[1]=0;a[2]=0;a[3]=0;a[4]=0;a[5]=1;a[6]=0;a[7]=0;a[8]=0;a[9]=0;a[10]=1;a[11]=0;a[12]=0;a[13]=0;a[14]=0;a[15]=1;return a},transpose:function(a,b){if(!b||a===b){var c=a[1],d=a[2],e=a[3],g=a[6],f=a[7],k=a[11];a[1]=a[4];a[2]=a[8];a[3]=a[12];a[4]=c;a[6]=a[9];a[7]=a[13];a[8]=d;a[9]=g;a[11]=a[14];a[12]=e;a[13]=f;a[14]=k;return a}b[0]=a[0];b[1]=a[4];b[2]=a[8];b[3]=a[12];b[4]=a[1];b[5]=a[5];b[6]=a[9];b[7]=a[13];b[8]=a[2];b[9]=a[6];b[10]=a[10];b[11]=a[14];
b[12]=a[3];b[13]=a[7];b[14]=a[11];b[15]=a[15];return b},determinant:function(a){var b=a[0],c=a[1],d=a[2],e=a[3],g=a[4],f=a[5],k=a[6],j=a[7],i=a[8],m=a[9],l=a[10],G=a[11],q=a[12],o=a[13],h=a[14],a=a[15];return q*m*k*e-i*o*k*e-q*f*l*e+g*o*l*e+i*f*h*e-g*m*h*e-q*m*d*j+i*o*d*j+q*c*l*j-b*o*l*j-i*c*h*j+b*m*h*j+q*f*d*G-g*o*d*G-q*c*k*G+b*o*k*G+g*c*h*G-b*f*h*G-i*f*d*a+g*m*d*a+i*c*k*a-b*m*k*a-g*c*l*a+b*f*l*a},inverse:function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=a[3],f=a[4],k=a[5],j=a[6],i=a[7],m=a[8],l=
a[9],h=a[10],q=a[11],o=a[12],H=a[13],I=a[14],p=a[15],n=c*k-d*f,r=c*j-e*f,v=c*i-g*f,w=d*j-e*k,x=d*i-g*k,y=e*i-g*j,z=m*H-l*o,A=m*I-h*o,B=m*p-q*o,s=l*I-h*H,t=l*p-q*H,F=h*p-q*I,u=n*F-r*t+v*s+w*B-x*A+y*z;if(!u)return null;u=1/u;b[0]=(k*F-j*t+i*s)*u;b[1]=(-d*F+e*t-g*s)*u;b[2]=(H*y-I*x+p*w)*u;b[3]=(-l*y+h*x-q*w)*u;b[4]=(-f*F+j*B-i*A)*u;b[5]=(c*F-e*B+g*A)*u;b[6]=(-o*y+I*v-p*r)*u;b[7]=(m*y-h*v+q*r)*u;b[8]=(f*t-k*B+i*z)*u;b[9]=(-c*t+d*B-g*z)*u;b[10]=(o*x-H*v+p*n)*u;b[11]=(-m*x+l*v-q*n)*u;b[12]=(-f*s+k*A-j*
z)*u;b[13]=(c*s-d*A+e*z)*u;b[14]=(-o*w+H*r-I*n)*u;b[15]=(m*w-l*r+h*n)*u;return b},toRotationMat:function(a,b){b||(b=p.create());b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];b[4]=a[4];b[5]=a[5];b[6]=a[6];b[7]=a[7];b[8]=a[8];b[9]=a[9];b[10]=a[10];b[11]=a[11];b[12]=0;b[13]=0;b[14]=0;b[15]=1;return b},toMat3:function(a,b){b||(b=C.create());b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[4];b[4]=a[5];b[5]=a[6];b[6]=a[8];b[7]=a[9];b[8]=a[10];return b},toInverseMat3:function(a,b){var c=a[0],d=a[1],e=a[2],g=a[4],f=a[5],
k=a[6],j=a[8],i=a[9],m=a[10],l=m*f-k*i,h=-m*g+k*j,q=i*g-f*j,o=c*l+d*h+e*q;if(!o)return null;o=1/o;b||(b=C.create());b[0]=l*o;b[1]=(-m*d+e*i)*o;b[2]=(k*d-e*f)*o;b[3]=h*o;b[4]=(m*c-e*j)*o;b[5]=(-k*c+e*g)*o;b[6]=q*o;b[7]=(-i*c+d*j)*o;b[8]=(f*c-d*g)*o;return b},multiply:function(a,b,c){c||(c=a);var d=a[0],e=a[1],g=a[2],f=a[3],k=a[4],j=a[5],i=a[6],m=a[7],l=a[8],h=a[9],q=a[10],o=a[11],p=a[12],n=a[13],r=a[14],a=a[15],s=b[0],t=b[1],v=b[2],w=b[3],x=b[4],y=b[5],z=b[6],A=b[7],B=b[8],C=b[9],D=b[10],F=b[11],u=
b[12],E=b[13],J=b[14],b=b[15];c[0]=s*d+t*k+v*l+w*p;c[1]=s*e+t*j+v*h+w*n;c[2]=s*g+t*i+v*q+w*r;c[3]=s*f+t*m+v*o+w*a;c[4]=x*d+y*k+z*l+A*p;c[5]=x*e+y*j+z*h+A*n;c[6]=x*g+y*i+z*q+A*r;c[7]=x*f+y*m+z*o+A*a;c[8]=B*d+C*k+D*l+F*p;c[9]=B*e+C*j+D*h+F*n;c[10]=B*g+C*i+D*q+F*r;c[11]=B*f+C*m+D*o+F*a;c[12]=u*d+E*k+J*l+b*p;c[13]=u*e+E*j+J*h+b*n;c[14]=u*g+E*i+J*q+b*r;c[15]=u*f+E*m+J*o+b*a;return c},multiplyVec3:function(a,b,c){c||(c=b);var d=b[0],e=b[1],b=b[2];c[0]=a[0]*d+a[4]*e+a[8]*b+a[12];c[1]=a[1]*d+a[5]*e+a[9]*
b+a[13];c[2]=a[2]*d+a[6]*e+a[10]*b+a[14];return c},multiplyVec4:function(a,b,c){c||(c=b);var d=b[0],e=b[1],g=b[2],b=b[3];c[0]=a[0]*d+a[4]*e+a[8]*g+a[12]*b;c[1]=a[1]*d+a[5]*e+a[9]*g+a[13]*b;c[2]=a[2]*d+a[6]*e+a[10]*g+a[14]*b;c[3]=a[3]*d+a[7]*e+a[11]*g+a[15]*b;return c},translate:function(a,b,c){var d=b[0],e=b[1],b=b[2],g,f,k,j,i,m,l,h,q,o,p,n;if(!c||a===c)return a[12]=a[0]*d+a[4]*e+a[8]*b+a[12],a[13]=a[1]*d+a[5]*e+a[9]*b+a[13],a[14]=a[2]*d+a[6]*e+a[10]*b+a[14],a[15]=a[3]*d+a[7]*e+a[11]*b+a[15],a;g=
a[0];f=a[1];k=a[2];j=a[3];i=a[4];m=a[5];l=a[6];h=a[7];q=a[8];o=a[9];p=a[10];n=a[11];c[0]=g;c[1]=f;c[2]=k;c[3]=j;c[4]=i;c[5]=m;c[6]=l;c[7]=h;c[8]=q;c[9]=o;c[10]=p;c[11]=n;c[12]=g*d+i*e+q*b+a[12];c[13]=f*d+m*e+o*b+a[13];c[14]=k*d+l*e+p*b+a[14];c[15]=j*d+h*e+n*b+a[15];return c},scale:function(a,b,c){var d=b[0],e=b[1],b=b[2];if(!c||a===c)return a[0]*=d,a[1]*=d,a[2]*=d,a[3]*=d,a[4]*=e,a[5]*=e,a[6]*=e,a[7]*=e,a[8]*=b,a[9]*=b,a[10]*=b,a[11]*=b,a;c[0]=a[0]*d;c[1]=a[1]*d;c[2]=a[2]*d;c[3]=a[3]*d;c[4]=a[4]*
e;c[5]=a[5]*e;c[6]=a[6]*e;c[7]=a[7]*e;c[8]=a[8]*b;c[9]=a[9]*b;c[10]=a[10]*b;c[11]=a[11]*b;c[12]=a[12];c[13]=a[13];c[14]=a[14];c[15]=a[15];return c},rotate:function(a,b,c,d){var e=c[0],g=c[1],c=c[2],f=Math.sqrt(e*e+g*g+c*c),k,j,i,m,l,h,q,o,p,n,r,s,t,v,w,x,y,z,A,B;if(!f)return null;1!==f&&(f=1/f,e*=f,g*=f,c*=f);k=Math.sin(b);j=Math.cos(b);i=1-j;b=a[0];f=a[1];m=a[2];l=a[3];h=a[4];q=a[5];o=a[6];p=a[7];n=a[8];r=a[9];s=a[10];t=a[11];v=e*e*i+j;w=g*e*i+c*k;x=c*e*i-g*k;y=e*g*i-c*k;z=g*g*i+j;A=c*g*i+e*k;B=
e*c*i+g*k;e=g*c*i-e*k;g=c*c*i+j;d?a!==d&&(d[12]=a[12],d[13]=a[13],d[14]=a[14],d[15]=a[15]):d=a;d[0]=b*v+h*w+n*x;d[1]=f*v+q*w+r*x;d[2]=m*v+o*w+s*x;d[3]=l*v+p*w+t*x;d[4]=b*y+h*z+n*A;d[5]=f*y+q*z+r*A;d[6]=m*y+o*z+s*A;d[7]=l*y+p*z+t*A;d[8]=b*B+h*e+n*g;d[9]=f*B+q*e+r*g;d[10]=m*B+o*e+s*g;d[11]=l*B+p*e+t*g;return d},rotateX:function(a,b,c){var d=Math.sin(b),b=Math.cos(b),e=a[4],g=a[5],f=a[6],k=a[7],j=a[8],i=a[9],m=a[10],h=a[11];c?a!==c&&(c[0]=a[0],c[1]=a[1],c[2]=a[2],c[3]=a[3],c[12]=a[12],c[13]=a[13],c[14]=
a[14],c[15]=a[15]):c=a;c[4]=e*b+j*d;c[5]=g*b+i*d;c[6]=f*b+m*d;c[7]=k*b+h*d;c[8]=e*-d+j*b;c[9]=g*-d+i*b;c[10]=f*-d+m*b;c[11]=k*-d+h*b;return c},rotateY:function(a,b,c){var d=Math.sin(b),b=Math.cos(b),e=a[0],g=a[1],f=a[2],k=a[3],j=a[8],i=a[9],m=a[10],h=a[11];c?a!==c&&(c[4]=a[4],c[5]=a[5],c[6]=a[6],c[7]=a[7],c[12]=a[12],c[13]=a[13],c[14]=a[14],c[15]=a[15]):c=a;c[0]=e*b+j*-d;c[1]=g*b+i*-d;c[2]=f*b+m*-d;c[3]=k*b+h*-d;c[8]=e*d+j*b;c[9]=g*d+i*b;c[10]=f*d+m*b;c[11]=k*d+h*b;return c},rotateZ:function(a,b,
c){var d=Math.sin(b),b=Math.cos(b),e=a[0],g=a[1],f=a[2],k=a[3],j=a[4],i=a[5],h=a[6],l=a[7];c?a!==c&&(c[8]=a[8],c[9]=a[9],c[10]=a[10],c[11]=a[11],c[12]=a[12],c[13]=a[13],c[14]=a[14],c[15]=a[15]):c=a;c[0]=e*b+j*d;c[1]=g*b+i*d;c[2]=f*b+h*d;c[3]=k*b+l*d;c[4]=e*-d+j*b;c[5]=g*-d+i*b;c[6]=f*-d+h*b;c[7]=k*-d+l*b;return c},frustum:function(a,b,c,d,e,g,f){f||(f=p.create());var k=b-a,j=d-c,i=g-e;f[0]=2*e/k;f[1]=0;f[2]=0;f[3]=0;f[4]=0;f[5]=2*e/j;f[6]=0;f[7]=0;f[8]=(b+a)/k;f[9]=(d+c)/j;f[10]=-(g+e)/i;f[11]=-1;
f[12]=0;f[13]=0;f[14]=-(2*g*e)/i;f[15]=0;return f},perspective:function(a,b,c,d,e){a=c*Math.tan(a*Math.PI/360);b*=a;return p.frustum(-b,b,-a,a,c,d,e)},ortho:function(a,b,c,d,e,g,f){f||(f=p.create());var k=b-a,j=d-c,i=g-e;f[0]=2/k;f[1]=0;f[2]=0;f[3]=0;f[4]=0;f[5]=2/j;f[6]=0;f[7]=0;f[8]=0;f[9]=0;f[10]=-2/i;f[11]=0;f[12]=-(a+b)/k;f[13]=-(d+c)/j;f[14]=-(g+e)/i;f[15]=1;return f},lookAt:function(a,b,c,d){d||(d=p.create());var e,g,f,k,j,i,h,l,n=a[0],q=a[1],a=a[2];f=c[0];k=c[1];g=c[2];h=b[0];c=b[1];e=b[2];
if(n===h&&q===c&&a===e)return p.identity(d);b=n-h;c=q-c;h=a-e;l=1/Math.sqrt(b*b+c*c+h*h);b*=l;c*=l;h*=l;e=k*h-g*c;g=g*b-f*h;f=f*c-k*b;(l=Math.sqrt(e*e+g*g+f*f))?(l=1/l,e*=l,g*=l,f*=l):f=g=e=0;k=c*f-h*g;j=h*e-b*f;i=b*g-c*e;(l=Math.sqrt(k*k+j*j+i*i))?(l=1/l,k*=l,j*=l,i*=l):i=j=k=0;d[0]=e;d[1]=k;d[2]=b;d[3]=0;d[4]=g;d[5]=j;d[6]=c;d[7]=0;d[8]=f;d[9]=i;d[10]=h;d[11]=0;d[12]=-(e*n+g*q+f*a);d[13]=-(k*n+j*q+i*a);d[14]=-(b*n+c*q+h*a);d[15]=1;return d},fromRotationTranslation:function(a,b,c){c||(c=p.create());
var d=a[0],e=a[1],g=a[2],f=a[3],k=d+d,h=e+e,i=g+g,a=d*k,m=d*h,d=d*i,l=e*h,e=e*i,g=g*i,k=f*k,h=f*h,f=f*i;c[0]=1-(l+g);c[1]=m+f;c[2]=d-h;c[3]=0;c[4]=m-f;c[5]=1-(a+g);c[6]=e+k;c[7]=0;c[8]=d+h;c[9]=e-k;c[10]=1-(a+l);c[11]=0;c[12]=b[0];c[13]=b[1];c[14]=b[2];c[15]=1;return c},str:function(a){return"["+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+", "+a[4]+", "+a[5]+", "+a[6]+", "+a[7]+", "+a[8]+", "+a[9]+", "+a[10]+", "+a[11]+", "+a[12]+", "+a[13]+", "+a[14]+", "+a[15]+"]"}},h={create:function(a){var b=new s(4);
a&&(b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3]);return b},set:function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];return b},identity:function(a){a||(a=h.create());a[0]=0;a[1]=0;a[2]=0;a[3]=1;return a}},R=h.identity();h.calculateW=function(a,b){var c=a[0],d=a[1],e=a[2];if(!b||a===b)return a[3]=-Math.sqrt(Math.abs(1-c*c-d*d-e*e)),a;b[0]=c;b[1]=d;b[2]=e;b[3]=-Math.sqrt(Math.abs(1-c*c-d*d-e*e));return b};h.dot=function(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]};h.inverse=function(a,b){var c=
a[0],d=a[1],e=a[2],g=a[3],c=(c=c*c+d*d+e*e+g*g)?1/c:0;if(!b||a===b)return a[0]*=-c,a[1]*=-c,a[2]*=-c,a[3]*=c,a;b[0]=-a[0]*c;b[1]=-a[1]*c;b[2]=-a[2]*c;b[3]=a[3]*c;return b};h.conjugate=function(a,b){if(!b||a===b)return a[0]*=-1,a[1]*=-1,a[2]*=-1,a;b[0]=-a[0];b[1]=-a[1];b[2]=-a[2];b[3]=a[3];return b};h.length=function(a){var b=a[0],c=a[1],d=a[2],a=a[3];return Math.sqrt(b*b+c*c+d*d+a*a)};h.normalize=function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=a[3],f=Math.sqrt(c*c+d*d+e*e+g*g);if(0===f)return b[0]=
0,b[1]=0,b[2]=0,b[3]=0,b;f=1/f;b[0]=c*f;b[1]=d*f;b[2]=e*f;b[3]=g*f;return b};h.add=function(a,b,c){if(!c||a===c)return a[0]+=b[0],a[1]+=b[1],a[2]+=b[2],a[3]+=b[3],a;c[0]=a[0]+b[0];c[1]=a[1]+b[1];c[2]=a[2]+b[2];c[3]=a[3]+b[3];return c};h.multiply=function(a,b,c){c||(c=a);var d=a[0],e=a[1],g=a[2],a=a[3],f=b[0],h=b[1],j=b[2],b=b[3];c[0]=d*b+a*f+e*j-g*h;c[1]=e*b+a*h+g*f-d*j;c[2]=g*b+a*j+d*h-e*f;c[3]=a*b-d*f-e*h-g*j;return c};h.multiplyVec3=function(a,b,c){c||(c=b);var d=b[0],e=b[1],g=b[2],b=a[0],f=a[1],
h=a[2],a=a[3],j=a*d+f*g-h*e,i=a*e+h*d-b*g,m=a*g+b*e-f*d,d=-b*d-f*e-h*g;c[0]=j*a+d*-b+i*-h-m*-f;c[1]=i*a+d*-f+m*-b-j*-h;c[2]=m*a+d*-h+j*-f-i*-b;return c};h.scale=function(a,b,c){if(!c||a===c)return a[0]*=b,a[1]*=b,a[2]*=b,a[3]*=b,a;c[0]=a[0]*b;c[1]=a[1]*b;c[2]=a[2]*b;c[3]=a[3]*b;return c};h.toMat3=function(a,b){b||(b=C.create());var c=a[0],d=a[1],e=a[2],g=a[3],f=c+c,h=d+d,j=e+e,i=c*f,m=c*h,c=c*j,l=d*h,d=d*j,e=e*j,f=g*f,h=g*h,g=g*j;b[0]=1-(l+e);b[1]=m+g;b[2]=c-h;b[3]=m-g;b[4]=1-(i+e);b[5]=d+f;b[6]=
c+h;b[7]=d-f;b[8]=1-(i+l);return b};h.toMat4=function(a,b){b||(b=p.create());var c=a[0],d=a[1],e=a[2],g=a[3],f=c+c,h=d+d,j=e+e,i=c*f,m=c*h,c=c*j,l=d*h,d=d*j,e=e*j,f=g*f,h=g*h,g=g*j;b[0]=1-(l+e);b[1]=m+g;b[2]=c-h;b[3]=0;b[4]=m-g;b[5]=1-(i+e);b[6]=d+f;b[7]=0;b[8]=c+h;b[9]=d-f;b[10]=1-(i+l);b[11]=0;b[12]=0;b[13]=0;b[14]=0;b[15]=1;return b};h.slerp=function(a,b,c,d){d||(d=a);var e=a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3],g,f;if(1<=Math.abs(e))return d!==a&&(d[0]=a[0],d[1]=a[1],d[2]=a[2],d[3]=a[3]),d;g=
Math.acos(e);f=Math.sqrt(1-e*e);if(0.001>Math.abs(f))return d[0]=0.5*a[0]+0.5*b[0],d[1]=0.5*a[1]+0.5*b[1],d[2]=0.5*a[2]+0.5*b[2],d[3]=0.5*a[3]+0.5*b[3],d;e=Math.sin((1-c)*g)/f;c=Math.sin(c*g)/f;d[0]=a[0]*e+b[0]*c;d[1]=a[1]*e+b[1]*c;d[2]=a[2]*e+b[2]*c;d[3]=a[3]*e+b[3]*c;return d};h.fromRotationMatrix=function(a,b){b||(b=h.create());var c=a[0]+a[4]+a[8],d;if(0<c)d=Math.sqrt(c+1),b[3]=0.5*d,d=0.5/d,b[0]=(a[7]-a[5])*d,b[1]=(a[2]-a[6])*d,b[2]=(a[3]-a[1])*d;else{d=h.fromRotationMatrix.s_iNext=h.fromRotationMatrix.s_iNext||
[1,2,0];c=0;a[4]>a[0]&&(c=1);a[8]>a[3*c+c]&&(c=2);var e=d[c],g=d[e];d=Math.sqrt(a[3*c+c]-a[3*e+e]-a[3*g+g]+1);b[c]=0.5*d;d=0.5/d;b[3]=(a[3*g+e]-a[3*e+g])*d;b[e]=(a[3*e+c]+a[3*c+e])*d;b[g]=(a[3*g+c]+a[3*c+g])*d}return b};C.toQuat4=h.fromRotationMatrix;(function(){var a=C.create();h.fromAxes=function(b,c,d,e){a[0]=c[0];a[3]=c[1];a[6]=c[2];a[1]=d[0];a[4]=d[1];a[7]=d[2];a[2]=b[0];a[5]=b[1];a[8]=b[2];return h.fromRotationMatrix(a,e)}})();h.identity=function(a){a||(a=h.create());a[0]=0;a[1]=0;a[2]=0;a[3]=
1;return a};h.fromAngleAxis=function(a,b,c){c||(c=h.create());var a=0.5*a,d=Math.sin(a);c[3]=Math.cos(a);c[0]=d*b[0];c[1]=d*b[1];c[2]=d*b[2];return c};h.toAngleAxis=function(a,b){b||(b=a);var c=a[0]*a[0]+a[1]*a[1]+a[2]*a[2];0<c?(b[3]=2*Math.acos(a[3]),c=E.invsqrt(c),b[0]=a[0]*c,b[1]=a[1]*c,b[2]=a[2]*c):(b[3]=0,b[0]=1,b[1]=0,b[2]=0);return b};h.str=function(a){return"["+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+"]"};var N={create:function(a){var b=new s(2);a?(b[0]=a[0],b[1]=a[1]):(b[0]=0,b[1]=0);return b},
add:function(a,b,c){c||(c=b);c[0]=a[0]+b[0];c[1]=a[1]+b[1];return c},subtract:function(a,b,c){c||(c=b);c[0]=a[0]-b[0];c[1]=a[1]-b[1];return c},multiply:function(a,b,c){c||(c=b);c[0]=a[0]*b[0];c[1]=a[1]*b[1];return c},divide:function(a,b,c){c||(c=b);c[0]=a[0]/b[0];c[1]=a[1]/b[1];return c},scale:function(a,b,c){c||(c=a);c[0]=a[0]*b;c[1]=a[1]*b;return c},dist:function(a,b){var c=b[0]-a[0],d=b[1]-a[1];return Math.sqrt(c*c+d*d)},set:function(a,b){b[0]=a[0];b[1]=a[1];return b},negate:function(a,b){b||(b=
a);b[0]=-a[0];b[1]=-a[1];return b},normalize:function(a,b){b||(b=a);var c=a[0]*a[0]+a[1]*a[1];0<c?(c=Math.sqrt(c),b[0]=a[0]/c,b[1]=a[1]/c):b[0]=b[1]=0;return b},cross:function(a,b,c){a=a[0]*b[1]-a[1]*b[0];if(!c)return a;c[0]=c[1]=0;c[2]=a;return c},length:function(a){var b=a[0],a=a[1];return Math.sqrt(b*b+a*a)},dot:function(a,b){return a[0]*b[0]+a[1]*b[1]},direction:function(a,b,c){c||(c=a);var d=a[0]-b[0],a=a[1]-b[1],b=d*d+a*a;if(!b)return c[0]=0,c[1]=0,c[2]=0,c;b=1/Math.sqrt(b);c[0]=d*b;c[1]=a*
b;return c},lerp:function(a,b,c,d){d||(d=a);d[0]=a[0]+c*(b[0]-a[0]);d[1]=a[1]+c*(b[1]-a[1]);return d},str:function(a){return"["+a[0]+", "+a[1]+"]"}},M={create:function(a){var b=new s(4);a&&(b[0]=a[0],b[1]=a[1],b[2]=a[2],b[3]=a[3]);return b},set:function(a,b){b[0]=a[0];b[1]=a[1];b[2]=a[2];b[3]=a[3];return b},identity:function(a){a||(a=M.create());a[0]=1;a[1]=0;a[2]=0;a[3]=1;return a},transpose:function(a,b){if(!b||a===b){var c=a[1];a[1]=a[2];a[2]=c;return a}b[0]=a[0];b[1]=a[2];b[2]=a[1];b[3]=a[3];
return b},determinant:function(a){return a[0]*a[3]-a[2]*a[1]},inverse:function(a,b){b||(b=a);var c=a[0],d=a[1],e=a[2],g=a[3],f=c*g-e*d;if(!f)return null;f=1/f;b[0]=g*f;b[1]=-d*f;b[2]=-e*f;b[3]=c*f;return b},multiply:function(a,b,c){c||(c=a);var d=a[0],e=a[1],g=a[2],a=a[3];c[0]=d*b[0]+e*b[2];c[1]=d*b[1]+e*b[3];c[2]=g*b[0]+a*b[2];c[3]=g*b[1]+a*b[3];return c},rotate:function(a,b,c){c||(c=a);var d=a[0],e=a[1],g=a[2],a=a[3],f=Math.sin(b),b=Math.cos(b);c[0]=d*b+e*f;c[1]=d*-f+e*b;c[2]=g*b+a*f;c[3]=g*-f+
a*b;return c},multiplyVec2:function(a,b,c){c||(c=b);var d=b[0],b=b[1];c[0]=d*a[0]+b*a[1];c[1]=d*a[2]+b*a[3];return c},scale:function(a,b,c){c||(c=a);var d=a[1],e=a[2],g=a[3],f=b[0],b=b[1];c[0]=a[0]*f;c[1]=d*b;c[2]=e*f;c[3]=g*b;return c},str:function(a){return"["+a[0]+", "+a[1]+", "+a[2]+", "+a[3]+"]"}};n&&(n.glMatrixArrayType=s,n.MatrixArray=s,n.setMatrixArrayType=D,n.determineMatrixArrayType=K,n.glMath=E,n.vec2=N,n.vec3=r,n.mat2=M,n.mat3=C,n.mat4=p,n.quat4=h);return{glMatrixArrayType:s,MatrixArray:s,
setMatrixArrayType:D,determineMatrixArrayType:K,glMath:E,vec2:N,vec3:r,mat2:M,mat3:C,mat4:p,quat4:h}});

var UTIL = (function() {
"use strict"; 

/*
Copyright (c) 2012 Rico Possienka 

This software is provided 'as-is', without any express or implied warranty. In no event will the authors be held liable for any damages arising from the use of this software.

Permission is granted to anyone to use this software for any purpose, including commercial applications, and to alter it and redistribute it freely, subject to the following restrictions:

 - The origin of this software must not be misrepresented; you must not claim that you wrote the original software. If you use this software in a product, an acknowledgment in the product documentation would be appreciated but is not required.
 - Altered source versions must be plainly marked as such, and must not be misrepresented as being the original software.
 - This notice may not be removed or altered from any source distribution.
*/
if(window["WebGLRenderingContext"]) {
	window["WebGLRenderingContext"]["prototype"]["getSafeContext"] = 
	(function (){
		"use strict"; 
		
		// var METHODS ... 
		/* this is autogenerated. Don't edit by hand! */ 
		var METHODS = 
		{"releaseShaderCompiler":[{"args":[]}],"getContextAttributes":[{"args":[]}],"isContextLost":[{"args":[]}],"getSupportedExtensions":[{"args":[]}],"getExtension":[{"args":[{"name":"name","type":"DOMString"}]}],"activeTexture":[{"args":[{"name":"texture","type":"GLenum"}]}],"attachShader":[{"args":[{"name":"program","type":"WebGLProgram"},{"name":"shader","type":"WebGLShader"}]}],"bindAttribLocation":[{"args":[{"name":"program","type":"WebGLProgram"},{"name":"index","type":"GLuint"},{"name":"name","type":"DOMString"}]}],"bindBuffer":[{"args":[{"name":"target","type":"GLenum"},{"name":"buffer","type":"WebGLBuffer"}]}],"bindFramebuffer":[{"args":[{"name":"target","type":"GLenum"},{"name":"framebuffer","type":"WebGLFramebuffer"}]}],"bindRenderbuffer":[{"args":[{"name":"target","type":"GLenum"},{"name":"renderbuffer","type":"WebGLRenderbuffer"}]}],"bindTexture":[{"args":[{"name":"target","type":"GLenum"},{"name":"texture","type":"WebGLTexture"}]}],"blendColor":[{"args":[{"name":"red","type":"GLclampf"},{"name":"green","type":"GLclampf"},{"name":"blue","type":"GLclampf"},{"name":"alpha","type":"GLclampf"}]}],"blendEquation":[{"args":[{"name":"mode","type":"GLenum"}]}],"blendEquationSeparate":[{"args":[{"name":"modeRGB","type":"GLenum"},{"name":"modeAlpha","type":"GLenum"}]}],"blendFunc":[{"args":[{"name":"sfactor","type":"GLenum"},{"name":"dfactor","type":"GLenum"}]}],"blendFuncSeparate":[{"args":[{"name":"srcRGB","type":"GLenum"},{"name":"dstRGB","type":"GLenum"},{"name":"srcAlpha","type":"GLenum"},{"name":"dstAlpha","type":"GLenum"}]}],"bufferData":[{"args":[{"name":"target","type":"GLenum"},{"name":"size","type":"GLsizeiptr"},{"name":"usage","type":"GLenum"}]},{"args":[{"name":"target","type":"GLenum"},{"name":"data","type":"ArrayBufferView"},{"name":"usage","type":"GLenum"}]},{"args":[{"name":"target","type":"GLenum"},{"name":"data","type":"ArrayBuffer"},{"name":"usage","type":"GLenum"}]}],"bufferSubData":[{"args":[{"name":"target","type":"GLenum"},{"name":"offset","type":"GLintptr"},{"name":"data","type":"ArrayBufferView"}]},{"args":[{"name":"target","type":"GLenum"},{"name":"offset","type":"GLintptr"},{"name":"data","type":"ArrayBuffer"}]}],"checkFramebufferStatus":[{"args":[{"name":"target","type":"GLenum"}]}],"clear":[{"args":[{"name":"mask","type":"GLbitfield"}]}],"clearColor":[{"args":[{"name":"red","type":"GLclampf"},{"name":"green","type":"GLclampf"},{"name":"blue","type":"GLclampf"},{"name":"alpha","type":"GLclampf"}]}],"clearDepth":[{"args":[{"name":"depth","type":"GLclampf"}]}],"clearStencil":[{"args":[{"name":"s","type":"GLint"}]}],"colorMask":[{"args":[{"name":"red","type":"GLboolean"},{"name":"green","type":"GLboolean"},{"name":"blue","type":"GLboolean"},{"name":"alpha","type":"GLboolean"}]}],"compileShader":[{"args":[{"name":"shader","type":"WebGLShader"}]}],"copyTexImage2D":[{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"internalformat","type":"GLenum"},{"name":"x","type":"GLint"},{"name":"y","type":"GLint"},{"name":"width","type":"GLsizei"},{"name":"height","type":"GLsizei"},{"name":"border","type":"GLint"}]}],"copyTexSubImage2D":[{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"xoffset","type":"GLint"},{"name":"yoffset","type":"GLint"},{"name":"x","type":"GLint"},{"name":"y","type":"GLint"},{"name":"width","type":"GLsizei"},{"name":"height","type":"GLsizei"}]}],"createBuffer":[{"args":[]}],"createFramebuffer":[{"args":[]}],"createProgram":[{"args":[]}],"createRenderbuffer":[{"args":[]}],"createShader":[{"args":[{"name":"type","type":"GLenum"}]}],"createTexture":[{"args":[]}],"cullFace":[{"args":[{"name":"mode","type":"GLenum"}]}],"deleteBuffer":[{"args":[{"name":"buffer","type":"WebGLBuffer"}]}],"deleteFramebuffer":[{"args":[{"name":"framebuffer","type":"WebGLFramebuffer"}]}],"deleteProgram":[{"args":[{"name":"program","type":"WebGLProgram"}]}],"deleteRenderbuffer":[{"args":[{"name":"renderbuffer","type":"WebGLRenderbuffer"}]}],"deleteShader":[{"args":[{"name":"shader","type":"WebGLShader"}]}],"deleteTexture":[{"args":[{"name":"texture","type":"WebGLTexture"}]}],"depthFunc":[{"args":[{"name":"func","type":"GLenum"}]}],"depthMask":[{"args":[{"name":"flag","type":"GLboolean"}]}],"depthRange":[{"args":[{"name":"zNear","type":"GLclampf"},{"name":"zFar","type":"GLclampf"}]}],"detachShader":[{"args":[{"name":"program","type":"WebGLProgram"},{"name":"shader","type":"WebGLShader"}]}],"disable":[{"args":[{"name":"cap","type":"GLenum"}]}],"disableVertexAttribArray":[{"args":[{"name":"index","type":"GLuint"}]}],"drawArrays":[{"args":[{"name":"mode","type":"GLenum"},{"name":"first","type":"GLint"},{"name":"count","type":"GLsizei"}]}],"drawElements":[{"args":[{"name":"mode","type":"GLenum"},{"name":"count","type":"GLsizei"},{"name":"type","type":"GLenum"},{"name":"offset","type":"GLintptr"}]}],"enable":[{"args":[{"name":"cap","type":"GLenum"}]}],"enableVertexAttribArray":[{"args":[{"name":"index","type":"GLuint"}]}],"finish":[{"args":[]}],"flush":[{"args":[]}],"framebufferRenderbuffer":[{"args":[{"name":"target","type":"GLenum"},{"name":"attachment","type":"GLenum"},{"name":"renderbuffertarget","type":"GLenum"},{"name":"renderbuffer","type":"WebGLRenderbuffer"}]}],"framebufferTexture2D":[{"args":[{"name":"target","type":"GLenum"},{"name":"attachment","type":"GLenum"},{"name":"textarget","type":"GLenum"},{"name":"texture","type":"WebGLTexture"},{"name":"level","type":"GLint"}]}],"frontFace":[{"args":[{"name":"mode","type":"GLenum"}]}],"generateMipmap":[{"args":[{"name":"target","type":"GLenum"}]}],"getActiveAttrib":[{"args":[{"name":"program","type":"WebGLProgram"},{"name":"index","type":"GLuint"}]}],"getActiveUniform":[{"args":[{"name":"program","type":"WebGLProgram"},{"name":"index","type":"GLuint"}]}],"getAttachedShaders":[{"args":[{"name":"program","type":"WebGLProgram"}]}],"getAttribLocation":[{"args":[{"name":"program","type":"WebGLProgram"},{"name":"name","type":"DOMString"}]}],"getParameter":[{"args":[{"name":"pname","type":"GLenum"}]}],"getBufferParameter":[{"args":[{"name":"target","type":"GLenum"},{"name":"pname","type":"GLenum"}]}],"getError":[{"args":[]}],"getFramebufferAttachmentParameter":[{"args":[{"name":"target","type":"GLenum"},{"name":"attachment","type":"GLenum"},{"name":"pname","type":"GLenum"}]}],"getProgramParameter":[{"args":[{"name":"program","type":"WebGLProgram"},{"name":"pname","type":"GLenum"}]}],"getProgramInfoLog":[{"args":[{"name":"program","type":"WebGLProgram"}]}],"getRenderbufferParameter":[{"args":[{"name":"target","type":"GLenum"},{"name":"pname","type":"GLenum"}]}],"getShaderParameter":[{"args":[{"name":"shader","type":"WebGLShader"},{"name":"pname","type":"GLenum"}]}],"getShaderInfoLog":[{"args":[{"name":"shader","type":"WebGLShader"}]}],"getShaderSource":[{"args":[{"name":"shader","type":"WebGLShader"}]}],"getTexParameter":[{"args":[{"name":"target","type":"GLenum"},{"name":"pname","type":"GLenum"}]}],"getUniform":[{"args":[{"name":"program","type":"WebGLProgram"},{"name":"location","type":"WebGLUniformLocation"}]}],"getUniformLocation":[{"args":[{"name":"program","type":"WebGLProgram"},{"name":"name","type":"DOMString"}]}],"getVertexAttrib":[{"args":[{"name":"index","type":"GLuint"},{"name":"pname","type":"GLenum"}]}],"getVertexAttribOffset":[{"args":[{"name":"index","type":"GLuint"},{"name":"pname","type":"GLenum"}]}],"hint":[{"args":[{"name":"target","type":"GLenum"},{"name":"mode","type":"GLenum"}]}],"isBuffer":[{"args":[{"name":"buffer","type":"WebGLBuffer"}]}],"isEnabled":[{"args":[{"name":"cap","type":"GLenum"}]}],"isFramebuffer":[{"args":[{"name":"framebuffer","type":"WebGLFramebuffer"}]}],"isProgram":[{"args":[{"name":"program","type":"WebGLProgram"}]}],"isRenderbuffer":[{"args":[{"name":"renderbuffer","type":"WebGLRenderbuffer"}]}],"isShader":[{"args":[{"name":"shader","type":"WebGLShader"}]}],"isTexture":[{"args":[{"name":"texture","type":"WebGLTexture"}]}],"lineWidth":[{"args":[{"name":"width","type":"GLfloat"}]}],"linkProgram":[{"args":[{"name":"program","type":"WebGLProgram"}]}],"pixelStorei":[{"args":[{"name":"pname","type":"GLenum"},{"name":"param","type":"GLint"}]}],"polygonOffset":[{"args":[{"name":"factor","type":"GLfloat"},{"name":"units","type":"GLfloat"}]}],"readPixels":[{"args":[{"name":"x","type":"GLint"},{"name":"y","type":"GLint"},{"name":"width","type":"GLsizei"},{"name":"height","type":"GLsizei"},{"name":"format","type":"GLenum"},{"name":"type","type":"GLenum"},{"name":"pixels","type":"ArrayBufferView"}]}],"renderbufferStorage":[{"args":[{"name":"target","type":"GLenum"},{"name":"internalformat","type":"GLenum"},{"name":"width","type":"GLsizei"},{"name":"height","type":"GLsizei"}]}],"sampleCoverage":[{"args":[{"name":"value","type":"GLclampf"},{"name":"invert","type":"GLboolean"}]}],"scissor":[{"args":[{"name":"x","type":"GLint"},{"name":"y","type":"GLint"},{"name":"width","type":"GLsizei"},{"name":"height","type":"GLsizei"}]}],"shaderSource":[{"args":[{"name":"shader","type":"WebGLShader"},{"name":"source","type":"DOMString"}]}],"stencilFunc":[{"args":[{"name":"func","type":"GLenum"},{"name":"ref","type":"GLint"},{"name":"mask","type":"GLuint"}]}],"stencilFuncSeparate":[{"args":[{"name":"face","type":"GLenum"},{"name":"func","type":"GLenum"},{"name":"ref","type":"GLint"},{"name":"mask","type":"GLuint"}]}],"stencilMask":[{"args":[{"name":"mask","type":"GLuint"}]}],"stencilMaskSeparate":[{"args":[{"name":"face","type":"GLenum"},{"name":"mask","type":"GLuint"}]}],"stencilOp":[{"args":[{"name":"fail","type":"GLenum"},{"name":"zfail","type":"GLenum"},{"name":"zpass","type":"GLenum"}]}],"stencilOpSeparate":[{"args":[{"name":"face","type":"GLenum"},{"name":"fail","type":"GLenum"},{"name":"zfail","type":"GLenum"},{"name":"zpass","type":"GLenum"}]}],"texImage2D":[{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"internalformat","type":"GLenum"},{"name":"width","type":"GLsizei"},{"name":"height","type":"GLsizei"},{"name":"border","type":"GLint"},{"name":"format","type":"GLenum"},{"name":"type","type":"GLenum"},{"name":"pixels","type":"ArrayBufferView"}]},{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"internalformat","type":"GLenum"},{"name":"format","type":"GLenum"},{"name":"type","type":"GLenum"},{"name":"pixels","type":"ImageData"}]},{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"internalformat","type":"GLenum"},{"name":"format","type":"GLenum"},{"name":"type","type":"GLenum"},{"name":"image","type":"HTMLImageElement"}]},{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"internalformat","type":"GLenum"},{"name":"format","type":"GLenum"},{"name":"type","type":"GLenum"},{"name":"canvas","type":"HTMLCanvasElement"}]},{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"internalformat","type":"GLenum"},{"name":"format","type":"GLenum"},{"name":"type","type":"GLenum"},{"name":"video","type":"HTMLVideoElement"}]}],"texParameterf":[{"args":[{"name":"target","type":"GLenum"},{"name":"pname","type":"GLenum"},{"name":"param","type":"GLfloat"}]}],"texParameteri":[{"args":[{"name":"target","type":"GLenum"},{"name":"pname","type":"GLenum"},{"name":"param","type":"GLint"}]}],"texSubImage2D":[{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"xoffset","type":"GLint"},{"name":"yoffset","type":"GLint"},{"name":"width","type":"GLsizei"},{"name":"height","type":"GLsizei"},{"name":"format","type":"GLenum"},{"name":"type","type":"GLenum"},{"name":"pixels","type":"ArrayBufferView"}]},{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"xoffset","type":"GLint"},{"name":"yoffset","type":"GLint"},{"name":"format","type":"GLenum"},{"name":"type","type":"GLenum"},{"name":"pixels","type":"ImageData"}]},{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"xoffset","type":"GLint"},{"name":"yoffset","type":"GLint"},{"name":"format","type":"GLenum"},{"name":"type","type":"GLenum"},{"name":"image","type":"HTMLImageElement"}]},{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"xoffset","type":"GLint"},{"name":"yoffset","type":"GLint"},{"name":"format","type":"GLenum"},{"name":"type","type":"GLenum"},{"name":"canvas","type":"HTMLCanvasElement"}]},{"args":[{"name":"target","type":"GLenum"},{"name":"level","type":"GLint"},{"name":"xoffset","type":"GLint"},{"name":"yoffset","type":"GLint"},{"name":"format","type":"GLenum"},{"name":"type","type":"GLenum"},{"name":"video","type":"HTMLVideoElement"}]}],"uniform1f":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"x","type":"GLfloat"}]}],"uniform1fv":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"v","type":"FloatArray"}]}],"uniform1i":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"x","type":"GLint"}]}],"uniform1iv":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"v","type":"Int32Array"}]}],"uniform2f":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"x","type":"GLfloat"},{"name":"y","type":"GLfloat"}]}],"uniform2fv":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"v","type":"FloatArray"}]}],"uniform2i":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"x","type":"GLint"},{"name":"y","type":"GLint"}]}],"uniform2iv":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"v","type":"Int32Array"}]}],"uniform3f":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"x","type":"GLfloat"},{"name":"y","type":"GLfloat"},{"name":"z","type":"GLfloat"}]}],"uniform3fv":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"v","type":"FloatArray"}]}],"uniform3i":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"x","type":"GLint"},{"name":"y","type":"GLint"},{"name":"z","type":"GLint"}]}],"uniform3iv":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"v","type":"Int32Array"}]}],"uniform4f":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"x","type":"GLfloat"},{"name":"y","type":"GLfloat"},{"name":"z","type":"GLfloat"},{"name":"w","type":"GLfloat"}]}],"uniform4fv":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"v","type":"FloatArray"}]}],"uniform4i":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"x","type":"GLint"},{"name":"y","type":"GLint"},{"name":"z","type":"GLint"},{"name":"w","type":"GLint"}]}],"uniform4iv":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"v","type":"Int32Array"}]}],"uniformMatrix2fv":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"transpose","type":"GLboolean"},{"name":"value","type":"FloatArray"}]}],"uniformMatrix3fv":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"transpose","type":"GLboolean"},{"name":"value","type":"FloatArray"}]}],"uniformMatrix4fv":[{"args":[{"name":"location","type":"WebGLUniformLocation"},{"name":"transpose","type":"GLboolean"},{"name":"value","type":"FloatArray"}]}],"useProgram":[{"args":[{"name":"program","type":"WebGLProgram"}]}],"validateProgram":[{"args":[{"name":"program","type":"WebGLProgram"}]}],"vertexAttrib1f":[{"args":[{"name":"indx","type":"GLuint"},{"name":"x","type":"GLfloat"}]}],"vertexAttrib1fv":[{"args":[{"name":"indx","type":"GLuint"},{"name":"values","type":"FloatArray"}]}],"vertexAttrib2f":[{"args":[{"name":"indx","type":"GLuint"},{"name":"x","type":"GLfloat"},{"name":"y","type":"GLfloat"}]}],"vertexAttrib2fv":[{"args":[{"name":"indx","type":"GLuint"},{"name":"values","type":"FloatArray"}]}],"vertexAttrib3f":[{"args":[{"name":"indx","type":"GLuint"},{"name":"x","type":"GLfloat"},{"name":"y","type":"GLfloat"},{"name":"z","type":"GLfloat"}]}],"vertexAttrib3fv":[{"args":[{"name":"indx","type":"GLuint"},{"name":"values","type":"FloatArray"}]}],"vertexAttrib4f":[{"args":[{"name":"indx","type":"GLuint"},{"name":"x","type":"GLfloat"},{"name":"y","type":"GLfloat"},{"name":"z","type":"GLfloat"},{"name":"w","type":"GLfloat"}]}],"vertexAttrib4fv":[{"args":[{"name":"indx","type":"GLuint"},{"name":"values","type":"FloatArray"}]}],"vertexAttribPointer":[{"args":[{"name":"indx","type":"GLuint"},{"name":"size","type":"GLint"},{"name":"type","type":"GLenum"},{"name":"normalized","type":"GLboolean"},{"name":"stride","type":"GLsizei"},{"name":"offset","type":"GLintptr"}]}],"viewport":[{"args":[{"name":"x","type":"GLint"},{"name":"y","type":"GLint"},{"name":"width","type":"GLsizei"},{"name":"height","type":"GLsizei"}]}]}
		;
		
		
		
		var checkType = {
			//OpenGL Type                      JS Types 
			"ArrayBuffer"          : checkType("null", "ArrayBuffer", "Float32Array", "Float64Array", "Int16Array", "Int32Array", "Int8Array", "Uint16Array", "Uint32Array", "Uint8Array", "Uint8ClampedArray", "Array"), 
			"ArrayBufferView"      : checkType("null", "ArrayBuffer", "Float32Array", "Float64Array", "Int16Array", "Int32Array", "Int8Array", "Uint16Array", "Uint32Array", "Uint8Array", "Uint8ClampedArray", "Array"), 
			"DOMString"            : checkType("null", "string"), 
			"FloatArray"           : checkType("null", "Float32Array", "Array"), 
			"GLbitfield"           : checkType("number"), 
			"GLboolean"            : checkType("boolean"),  
			"GLclampf"             : checkType("number"), 
			"GLenum"               : checkType("number"), 
			"GLfloat"              : checkType("number"), 
			"GLint"                : checkType("number"), 
			"GLintptr"             : checkType("number"), 
			"GLsizei"              : checkType("number"), 
			"GLsizeiptr"           : checkType("number"), 
			"GLuint"               : checkType("number"),
			"HTMLCanvasElement"    : checkType("null", "HTMLCanvasElement"),
			"HTMLImageElement"     : checkType("null", "HTMLImageElement"), 
			"HTMLVideoElement"     : checkType("null", "HTMLVideoElement"), 
			"ImageData"            : checkType("null", "ImageData"), 
			"Int32Array"           : checkType("null", "Int32Array", "Array"), 
			"WebGLBuffer"          : checkType("null", "WebGLBuffer"), 
			"WebGLFrameBuffer"     : checkType("null", "WebGLFrameBuffer"), 
			"WebGLProgram"         : checkType("null", "WebGLProgram"), 
			"WebGLRenderbuffer"    : checkType("null", "WebGLRenderbuffer"), 
			"WebGLShader"          : checkType("null", "WebGLShader"), 
			"WebGLTexture"         : checkType("null", "WebGLTexture"), 
			"WebGLUniformLocation" : checkType("null", "WebGLUniformLocation"), 
			"float"                : checkType("number"), 
			"long"                 : checkType("number") 
		};
		
		var checkValue = {
			//OpenGL Type            Way to check the correct value 
			"ArrayBuffer"          : checkFloatArray,
			"ArrayBufferView"      : checkFloatArray,
			"DOMString"            : ok, 
			"FloatArray"           : checkFloatArray, 
			"GLbitfield"           : isInt, 
			"GLboolean"            : isBool, 
			"GLclampf"             : isClampf, 
			"GLenum"               : isInt, 
			"GLfloat"              : ok, 
			"GLint"                : isInt, 
			"GLintptr"             : isInt, 
			"GLsizei"              : isInt, 
			"GLsizeiptr"           : isInt, 
			"GLuint"               : isInt, 
			"HTMLCanvasElement"    : ok, 
			"HTMLImageElement"     : ok, 
			"HTMLVideoElement"     : ok, 
			"ImageData"            : ok, 
			"Int32Array"           : checkIntArray, 
			"WebGLBuffer"          : ok, 
			"WebGLFrameBuffer"     : ok, 
			"WebGLProgram"         : ok, 
			"WebGLRenderbuffer"    : ok, 
			"WebGLShader"          : ok, 
			"WebGLTexture"         : ok, 
			"WebGLUniformLocation" : ok, 
			"float"                : ok, 
			"long"                 : isInt
		};
		
		function safeContext (gl, opt) { 
			var key, value, i, pair, safegl, map, keys, error; 	
		
			if(typeof opt === "string") {
				if(opt === "error") {
					error = throwError; 
				}
				else if(opt === "warn") {
					error = showWarning; 
				}
				else {
					throw new Error("can't process the option '" + opt + "!"); 
				}
			} 
			else if(typeof opt === "function") {
				error = opt; 
			}
			else {
				error = showWarning; 
			}
		
			keys = []; 
		
			for	(key in gl) {
				if(key === "getSafeContext") {
					continue; //ignore myself
				}
				keys.push(key); 
			}
		
			map = keys.map(function(key) {
				var val, type; 
				val = gl[key]; 
				type = typeof val; 
		
				if(type === "function") {
					return [key, createSafeCaller(gl, val, key, error)]; 
				}
			
				return [key]; 
			});
		
			safegl = { "isSafeContext" : true }; 
		
			//Add static properties. 
			for(i = 0; i != map.length; i++) {
				pair = map[i]; 
				key = pair[0]; 
				value = pair[1]; 
			
				if(value) {
					//override behaviour with my own function 
					safegl[key] = value; 
				} else {
					(function(key) { 
						//same behaviour as the original gl context. 
						Object.defineProperty(safegl, key, {
							get : function() { return gl[key]; }, 
							set : function(v) { gl[key] = v; }, 
							enumerable : true 
						}); 
					}(key)); 
				}
			}
		
			return safegl; 
		}
		
		function createSafeCaller (gl, func, funcname, error) {
			var glMethods = METHODS[funcname]; 
			if( !glMethods ) {
				console.warn("couldn't find reference definition for method " + funcname + "."); 
				//default behaviour
				return function() {
					return func.apply(gl, arguments); 	
				};
			}
		
			return function() {
				var funcDef = getFunctionDef(argumentsToArray(arguments), glMethods); 
		
				if(!funcDef) {
					error("couldn't apply arguments (" 
						+ argumentsToArray(arguments).join(", ") 
						+ ") to any of the possible schemas:\n" 
						+ glMethods.map(function(m) { 
							return "(" + m.args.map(function(arg) { return arg.type; }).join(", ") + ")" 
						  }).join("\n,") 
					); 
				}
				else {
					testArgumentValues(argumentsToArray(arguments), funcDef, funcname, error);
					//call original function 
					return func.apply(gl, arguments); 
				}
				
				return func.apply(gl, arguments); 
			};
		}
		
		function argumentsToArray(args) {
			return Array.prototype.slice.call(args); 
		}
		
		function testArgumentValues(args, funcDef, funcname, error) {
			var arg, type, name, i; 
			//check Arguments 
			//check if type is correct
			for( i=0; i != args.length; i++) {
				arg = args[i]; 
				type = funcDef.args[i].type; 
				name = funcDef.args[i].name; 
		
				if(!checkValue[type](arg)) {
					error("Argument '" + name + "' in function '" + funcname + "' was expected to be of type '" + type + "' but instead was called with value: " + arg); 
					return; 
				}
			}
		}
		
		function getFunctionDef(args, glMethods) {
				return glMethods.filter(function(glMethod) {				
					if(glMethod.args.length !== args.length) { 
						return false; 
					} 
		
					var i = 0; 
					return glMethod.args.every(function(glarg) {
						var ret = checkType[glarg.type](args[i++]); 
						return ret; 
					});
				})[0]; //undefined for no matches 
		}
		
		function throwError(text) {
			throw new Error(text); 
		}
		
		function showWarning(text) {
			console.warn(text); 
		}
		
		// ~~~ Type checking methods ~~~  
		function checkType() {
			var possibleTypes = argumentsToArray(arguments).map(function(type) { return type.toLowerCase(); });
			return function(value) {
				var valueType = toType(value); 
				return possibleTypes.some(function(type) { return valueType === type; }); 
			}
		}
		
		function ok() {
			//Value allready passed the typecheck and so the value is also correct. 
			return true; 
		}
		
		function checkFloatArray(v) {
			var type = toType(v); 
		
			if(type === "array") {
				for(var i = 0; i != v.length; i++) {
					if(!isFloat(v[i])) {
						return false; 
					}
				}
			}
		
			return true; 
		}
		
		function checkIntArray(v) {
			var type = toType(v); 
		
			if(type === "array") {
				for(var i = 0; i != v.length; i++) {
					if(!isInt(v[i])) {
						return false; 
					}
				}
			}
		
			return true; 
		}
		
		function isString(v) {
			return v === null || typeof v === "string"; 
		}
		
		function isFloat(v) {
			return typeof v === "number"; 
		}
		
		function isInt(v) {
			return typeof v === "number" && v === ~~v; 
		}
		
		function isBool(v) {
			return v === true || v === false; 
		}
		
		function isClampf(v) {
			return isFloat(v) && v >= 0 && v <= 1; 
		}
		
		//Fixing typeof http://javascriptweblog.wordpress.com/2011/08/08/fixing-the-javascript-typeof-operator/ 
		function toType (obj) {
			return ({}).toString.call(obj).match(/\s([a-zA-Z0-9]+)/)[1].toLowerCase();
		}
		

		return function(option) { return safeContext(this, option); }; 
	}()); 
}



//Copyright (c) 2009 The Chromium Authors. All rights reserved.
//Use of this source code is governed by a BSD-style license that can be
//found in the LICENSE file.

// Various functions for helping debug WebGL apps.

var WebGLDebugUtils = function() {

/**
 * Wrapped logging function.
 * @param {string} msg Message to log.
 */
var log = function(msg) {
  if (window.console && window.console.log) {
	throw msg; 
    window.console.log(msg);
  }
};

/**
 * Which arguements are enums.
 * @type {!Object.<number, string>}
 */
var glValidEnumContexts = {

  // Generic setters and getters

  'enable': { 0:true },
  'disable': { 0:true },
  'getParameter': { 0:true },

  // Rendering

  'drawArrays': { 0:true },
  'drawElements': { 0:true, 2:true },

  // Shaders

  'createShader': { 0:true },
  'getShaderParameter': { 1:true },
  'getProgramParameter': { 1:true },

  // Vertex attributes

  'getVertexAttrib': { 1:true },
  'vertexAttribPointer': { 2:true },

  // Textures

  'bindTexture': { 0:true },
  'activeTexture': { 0:true },
  'getTexParameter': { 0:true, 1:true },
  'texParameterf': { 0:true, 1:true },
  'texParameteri': { 0:true, 1:true, 2:true },
  'texImage2D': { 0:true, 2:true, 6:true, 7:true },
  'texSubImage2D': { 0:true, 6:true, 7:true },
  'copyTexImage2D': { 0:true, 2:true },
  'copyTexSubImage2D': { 0:true },
  'generateMipmap': { 0:true },

  // Buffer objects

  'bindBuffer': { 0:true },
  'bufferData': { 0:true, 2:true },
  'bufferSubData': { 0:true },
  'getBufferParameter': { 0:true, 1:true },

  // Renderbuffers and framebuffers

  'pixelStorei': { 0:true, 1:true },
  'readPixels': { 4:true, 5:true },
  'bindRenderbuffer': { 0:true },
  'bindFramebuffer': { 0:true },
  'checkFramebufferStatus': { 0:true },
  'framebufferRenderbuffer': { 0:true, 1:true, 2:true },
  'framebufferTexture2D': { 0:true, 1:true, 2:true },
  'getFramebufferAttachmentParameter': { 0:true, 1:true, 2:true },
  'getRenderbufferParameter': { 0:true, 1:true },
  'renderbufferStorage': { 0:true, 1:true },

  // Frame buffer operations (clear, blend, depth test, stencil)

  'clear': { 0:true },
  'depthFunc': { 0:true },
  'blendFunc': { 0:true, 1:true },
  'blendFuncSeparate': { 0:true, 1:true, 2:true, 3:true },
  'blendEquation': { 0:true },
  'blendEquationSeparate': { 0:true, 1:true },
  'stencilFunc': { 0:true },
  'stencilFuncSeparate': { 0:true, 1:true },
  'stencilMaskSeparate': { 0:true },
  'stencilOp': { 0:true, 1:true, 2:true },
  'stencilOpSeparate': { 0:true, 1:true, 2:true, 3:true },

  // Culling

  'cullFace': { 0:true },
  'frontFace': { 0:true },
};

/**
 * Map of numbers to names.
 * @type {Object}
 */
var glEnums = null;

/**
 * Initializes this module. Safe to call more than once.
 * @param {!WebGLRenderingContext} ctx A WebGL context. If
 *    you have more than one context it doesn't matter which one
 *    you pass in, it is only used to pull out constants.
 */
function init(ctx) {
  if (glEnums == null) {
    glEnums = { };
    for (var propertyName in ctx) {
      if (typeof ctx[propertyName] == 'number') {
        glEnums[ctx[propertyName]] = propertyName;
      }
    }
  }
}

/**
 * Checks the utils have been initialized.
 */
function checkInit() {
  if (glEnums == null) {
    throw 'WebGLDebugUtils.init(ctx) not called';
  }
}

/**
 * Returns true or false if value matches any WebGL enum
 * @param {*} value Value to check if it might be an enum.
 * @return {boolean} True if value matches one of the WebGL defined enums
 */
function mightBeEnum(value) {
  checkInit();
  return (glEnums[value] !== undefined);
}

/**
 * Gets an string version of an WebGL enum.
 *
 * Example:
 *   var str = WebGLDebugUtil.glEnumToString(ctx.getError());
 *
 * @param {number} value Value to return an enum for
 * @return {string} The string version of the enum.
 */
function glEnumToString(value) {
  checkInit();
  var name = glEnums[value];
  return (name !== undefined) ? name :
      ("*UNKNOWN WebGL ENUM (0x" + value.toString(16) + ")");
}

/**
 * Returns the string version of a WebGL argument.
 * Attempts to convert enum arguments to strings.
 * @param {string} functionName the name of the WebGL function.
 * @param {number} argumentIndx the index of the argument.
 * @param {*} value The value of the argument.
 * @return {string} The value as a string.
 */
function glFunctionArgToString(functionName, argumentIndex, value) {
  var funcInfo = glValidEnumContexts[functionName];
  if (funcInfo !== undefined) {
    if (funcInfo[argumentIndex]) {
      return glEnumToString(value);
    }
  }
  return value.toString();
}

function makePropertyWrapper(wrapper, original, propertyName) {
  //log("wrap prop: " + propertyName);
  wrapper.__defineGetter__(propertyName, function() {
    return original[propertyName];
  });
  // TODO(gmane): this needs to handle properties that take more than
  // one value?
  wrapper.__defineSetter__(propertyName, function(value) {
    //log("set: " + propertyName);
    original[propertyName] = value;
  });
}

// Makes a function that calls a function on another object.
function makeFunctionWrapper(original, functionName) {
  //log("wrap fn: " + functionName);
  var f = original[functionName];
  return function() {
    //log("call: " + functionName);
    var result = f.apply(original, arguments);
    return result;
  };
}

/**
 * Given a WebGL context returns a wrapped context that calls
 * gl.getError after every command and calls a function if the
 * result is not gl.NO_ERROR.
 *
 * @param {!WebGLRenderingContext} ctx The webgl context to
 *        wrap.
 * @param {!function(err, funcName, args): void} opt_onErrorFunc
 *        The function to call when gl.getError returns an
 *        error. If not specified the default function calls
 *        console.log with a message.
 */
function makeDebugContext(ctx, opt_onErrorFunc) {
  init(ctx);
  opt_onErrorFunc = opt_onErrorFunc || function(err, functionName, args) {
        // apparently we can't do args.join(",");
        var argStr = "";
        for (var ii = 0; ii < args.length; ++ii) {
          argStr += ((ii == 0) ? '' : ', ') +
              glFunctionArgToString(functionName, ii, args[ii]);
        }
        log("WebGL error "+ glEnumToString(err) + " in "+ functionName +
            "(" + argStr + ")");
      };

  // Holds booleans for each GL error so after we get the error ourselves
  // we can still return it to the client app.
  var glErrorShadow = { };

  // Makes a function that calls a WebGL function and then calls getError.
  function makeErrorWrapper(ctx, functionName) {
    return function() {
      var result = ctx[functionName].apply(ctx, arguments);
      var err = ctx.getError();
      if (err != 0) {
        glErrorShadow[err] = true;
        opt_onErrorFunc(err, functionName, arguments);
      }
      return result;
    };
  }

  // Make a an object that has a copy of every property of the WebGL context
  // but wraps all functions.
  var wrapper = {};
  for (var propertyName in ctx) {
    if (typeof ctx[propertyName] == 'function') {
       wrapper[propertyName] = makeErrorWrapper(ctx, propertyName);
     } else {
       makePropertyWrapper(wrapper, ctx, propertyName);
     }
  }

  // Override the getError function with one that returns our saved results.
  wrapper.getError = function() {
    for (var err in glErrorShadow) {
      if (glErrorShadow.hasOwnProperty(err)) {
        if (glErrorShadow[err]) {
          glErrorShadow[err] = false;
          return err;
        }
      }
    }
    return ctx.NO_ERROR;
  };

  return wrapper;
}

function resetToInitialState(ctx) {
  var numAttribs = ctx.getParameter(ctx.MAX_VERTEX_ATTRIBS);
  var tmp = ctx.createBuffer();
  ctx.bindBuffer(ctx.ARRAY_BUFFER, tmp);
  for (var ii = 0; ii < numAttribs; ++ii) {
    ctx.disableVertexAttribArray(ii);
    ctx.vertexAttribPointer(ii, 4, ctx.FLOAT, false, 0, 0);
    ctx.vertexAttrib1f(ii, 0);
  }
  ctx.deleteBuffer(tmp);

  var numTextureUnits = ctx.getParameter(ctx.MAX_TEXTURE_IMAGE_UNITS);
  for (var ii = 0; ii < numTextureUnits; ++ii) {
    ctx.activeTexture(ctx.TEXTURE0 + ii);
    ctx.bindTexture(ctx.TEXTURE_CUBE_MAP, null);
    ctx.bindTexture(ctx.TEXTURE_2D, null);
  }

  ctx.activeTexture(ctx.TEXTURE0);
  ctx.useProgram(null);
  ctx.bindBuffer(ctx.ARRAY_BUFFER, null);
  ctx.bindBuffer(ctx.ELEMENT_ARRAY_BUFFER, null);
  ctx.bindFramebuffer(ctx.FRAMEBUFFER, null);
  ctx.bindRenderbuffer(ctx.RENDERBUFFER, null);
  ctx.disable(ctx.BLEND);
  ctx.disable(ctx.CULL_FACE);
  ctx.disable(ctx.DEPTH_TEST);
  ctx.disable(ctx.DITHER);
  ctx.disable(ctx.SCISSOR_TEST);
  ctx.blendColor(0, 0, 0, 0);
  ctx.blendEquation(ctx.FUNC_ADD);
  ctx.blendFunc(ctx.ONE, ctx.ZERO);
  ctx.clearColor(0, 0, 0, 0);
  ctx.clearDepth(1);
  ctx.clearStencil(-1);
  ctx.colorMask(true, true, true, true);
  ctx.cullFace(ctx.BACK);
  ctx.depthFunc(ctx.LESS);
  ctx.depthMask(true);
  ctx.depthRange(0, 1);
  ctx.frontFace(ctx.CCW);
  ctx.hint(ctx.GENERATE_MIPMAP_HINT, ctx.DONT_CARE);
  ctx.lineWidth(1);
  ctx.pixelStorei(ctx.PACK_ALIGNMENT, 4);
  ctx.pixelStorei(ctx.UNPACK_ALIGNMENT, 4);
  ctx.pixelStorei(ctx.UNPACK_FLIP_Y_WEBGL, false);
  ctx.pixelStorei(ctx.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  // TODO: Delete this IF.
  if (ctx.UNPACK_COLORSPACE_CONVERSION_WEBGL) {
    ctx.pixelStorei(ctx.UNPACK_COLORSPACE_CONVERSION_WEBGL, ctx.BROWSER_DEFAULT_WEBGL);
  }
  ctx.polygonOffset(0, 0);
  ctx.sampleCoverage(1, false);
  ctx.scissor(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.stencilFunc(ctx.ALWAYS, 0, 0xFFFFFFFF);
  ctx.stencilMask(0xFFFFFFFF);
  ctx.stencilOp(ctx.KEEP, ctx.KEEP, ctx.KEEP);
  ctx.viewport(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.clear(ctx.COLOR_BUFFER_BIT | ctx.DEPTH_BUFFER_BIT | ctx.STENCIL_BUFFER_BIT);

  // TODO: This should NOT be needed but Firefox fails with 'hint'
  while(ctx.getError());
}

function makeLostContextSimulatingCanvas(canvas) {
  var unwrappedContext_;
  var wrappedContext_;
  var onLost_ = [];
  var onRestored_ = [];
  var wrappedContext_ = {};
  var contextId_ = 1;
  var contextLost_ = false;
  var resourceId_ = 0;
  var resourceDb_ = [];
  var numCallsToLoseContext_ = 0;
  var numCalls_ = 0;
  var canRestore_ = false;
  var restoreTimeout_ = 0;

  // Holds booleans for each GL error so can simulate errors.
  var glErrorShadow_ = { };

  canvas.getContext = function(f) {
    return function() {
      var ctx = f.apply(canvas, arguments);
      // Did we get a context and is it a WebGL context?
      if (ctx instanceof WebGLRenderingContext) {
        if (ctx != unwrappedContext_) {
          if (unwrappedContext_) {
            throw "got different context"
          }
          unwrappedContext_ = ctx;
          wrappedContext_ = makeLostContextSimulatingContext(unwrappedContext_);
        }
        return wrappedContext_;
      }
      return ctx;
    }
  }(canvas.getContext);

  function wrapEvent(listener) {
    if (typeof(listener) == "function") {
      return listener;
    } else {
      return function(info) {
        listener.handleEvent(info);
      }
    }
  }

  var addOnContextLostListener = function(listener) {
    onLost_.push(wrapEvent(listener));
  };

  var addOnContextRestoredListener = function(listener) {
    onRestored_.push(wrapEvent(listener));
  };


  function wrapAddEventListener(canvas) {
    var f = canvas.addEventListener;
    canvas.addEventListener = function(type, listener, bubble) {
      switch (type) {
        case 'webglcontextlost':
          addOnContextLostListener(listener);
          break;
        case 'webglcontextrestored':
          addOnContextRestoredListener(listener);
          break;
        default:
          f.apply(canvas, arguments);
      }
    };
  }

  wrapAddEventListener(canvas);

  canvas.loseContext = function() {
    if (!contextLost_) {
      contextLost_ = true;
      numCallsToLoseContext_ = 0;
      ++contextId_;
      while (unwrappedContext_.getError());
      clearErrors();
      glErrorShadow_[unwrappedContext_.CONTEXT_LOST_WEBGL] = true;
      var event = makeWebGLContextEvent("context lost");
      var callbacks = onLost_.slice();
      setTimeout(function() {
          //log("numCallbacks:" + callbacks.length);
          for (var ii = 0; ii < callbacks.length; ++ii) {
            //log("calling callback:" + ii);
            callbacks[ii](event);
          }
          if (restoreTimeout_ >= 0) {
            setTimeout(function() {
                canvas.restoreContext();
              }, restoreTimeout_);
          }
        }, 0);
    }
  };

  canvas.restoreContext = function() {
    if (contextLost_) {
      if (onRestored_.length) {
        setTimeout(function() {
            if (!canRestore_) {
              throw "can not restore. webglcontestlost listener did not call event.preventDefault";
            }
            freeResources();
            resetToInitialState(unwrappedContext_);
            contextLost_ = false;
            numCalls_ = 0;
            canRestore_ = false;
            var callbacks = onRestored_.slice();
            var event = makeWebGLContextEvent("context restored");
            for (var ii = 0; ii < callbacks.length; ++ii) {
              callbacks[ii](event);
            }
          }, 0);
      }
    }
  };

  canvas.loseContextInNCalls = function(numCalls) {
    if (contextLost_) {
      throw "You can not ask a lost contet to be lost";
    }
    numCallsToLoseContext_ = numCalls_ + numCalls;
  };

  canvas.getNumCalls = function() {
    return numCalls_;
  };

  canvas.setRestoreTimeout = function(timeout) {
    restoreTimeout_ = timeout;
  };

  function isWebGLObject(obj) {
    //return false;
    return (obj instanceof WebGLBuffer ||
            obj instanceof WebGLFramebuffer ||
            obj instanceof WebGLProgram ||
            obj instanceof WebGLRenderbuffer ||
            obj instanceof WebGLShader ||
            obj instanceof WebGLTexture);
  }

  function checkResources(args) {
    for (var ii = 0; ii < args.length; ++ii) {
      var arg = args[ii];
      if (isWebGLObject(arg)) {
        return arg.__webglDebugContextLostId__ == contextId_;
      }
    }
    return true;
  }

  function clearErrors() {
    var k = Object.keys(glErrorShadow_);
    for (var ii = 0; ii < k.length; ++ii) {
      delete glErrorShadow_[k];
    }
  }

  function loseContextIfTime() {
    ++numCalls_;
    if (!contextLost_) {
      if (numCallsToLoseContext_ == numCalls_) {
        canvas.loseContext();
      }
    }
  }

  // Makes a function that simulates WebGL when out of context.
  function makeLostContextFunctionWrapper(ctx, functionName) {
    var f = ctx[functionName];
    return function() {
      // log("calling:" + functionName);
      // Only call the functions if the context is not lost.
      loseContextIfTime();
      if (!contextLost_) {
        //if (!checkResources(arguments)) {
        //  glErrorShadow_[wrappedContext_.INVALID_OPERATION] = true;
        //  return;
        //}
        var result = f.apply(ctx, arguments);
        return result;
      }
    };
  }

  function freeResources() {
    for (var ii = 0; ii < resourceDb_.length; ++ii) {
      var resource = resourceDb_[ii];
      if (resource instanceof WebGLBuffer) {
        unwrappedContext_.deleteBuffer(resource);
      } else if (resource instanceof WebGLFramebuffer) {
        unwrappedContext_.deleteFramebuffer(resource);
      } else if (resource instanceof WebGLProgram) {
        unwrappedContext_.deleteProgram(resource);
      } else if (resource instanceof WebGLRenderbuffer) {
        unwrappedContext_.deleteRenderbuffer(resource);
      } else if (resource instanceof WebGLShader) {
        unwrappedContext_.deleteShader(resource);
      } else if (resource instanceof WebGLTexture) {
        unwrappedContext_.deleteTexture(resource);
      }
    }
  }

  function makeWebGLContextEvent(statusMessage) {
    return {
      statusMessage: statusMessage,
      preventDefault: function() {
          canRestore_ = true;
        }
    };
  }

  return canvas;

  function makeLostContextSimulatingContext(ctx) {
    // copy all functions and properties to wrapper
    for (var propertyName in ctx) {
      if (typeof ctx[propertyName] == 'function') {
         wrappedContext_[propertyName] = makeLostContextFunctionWrapper(
             ctx, propertyName);
       } else {
         makePropertyWrapper(wrappedContext_, ctx, propertyName);
       }
    }

    // Wrap a few functions specially.
    wrappedContext_.getError = function() {
      loseContextIfTime();
      if (!contextLost_) {
        var err;
        while (err = unwrappedContext_.getError()) {
          glErrorShadow_[err] = true;
        }
      }
      for (var err in glErrorShadow_) {
        if (glErrorShadow_[err]) {
          delete glErrorShadow_[err];
          return err;
        }
      }
      return wrappedContext_.NO_ERROR;
    };

    var creationFunctions = [
      "createBuffer",
      "createFramebuffer",
      "createProgram",
      "createRenderbuffer",
      "createShader",
      "createTexture"
    ];
    for (var ii = 0; ii < creationFunctions.length; ++ii) {
      var functionName = creationFunctions[ii];
      wrappedContext_[functionName] = function(f) {
        return function() {
          loseContextIfTime();
          if (contextLost_) {
            return null;
          }
          var obj = f.apply(ctx, arguments);
          obj.__webglDebugContextLostId__ = contextId_;
          resourceDb_.push(obj);
          return obj;
        };
      }(ctx[functionName]);
    }

    var functionsThatShouldReturnNull = [
      "getActiveAttrib",
      "getActiveUniform",
      "getBufferParameter",
      "getContextAttributes",
      "getAttachedShaders",
      "getFramebufferAttachmentParameter",
      "getParameter",
      "getProgramParameter",
      "getProgramInfoLog",
      "getRenderbufferParameter",
      "getShaderParameter",
      "getShaderInfoLog",
      "getShaderSource",
      "getTexParameter",
      "getUniform",
      "getUniformLocation",
      "getVertexAttrib"
    ];
    for (var ii = 0; ii < functionsThatShouldReturnNull.length; ++ii) {
      var functionName = functionsThatShouldReturnNull[ii];
      wrappedContext_[functionName] = function(f) {
        return function() {
          loseContextIfTime();
          if (contextLost_) {
            return null;
          }
          return f.apply(ctx, arguments);
        }
      }(wrappedContext_[functionName]);
    }

    var isFunctions = [
      "isBuffer",
      "isEnabled",
      "isFramebuffer",
      "isProgram",
      "isRenderbuffer",
      "isShader",
      "isTexture"
    ];
    for (var ii = 0; ii < isFunctions.length; ++ii) {
      var functionName = isFunctions[ii];
      wrappedContext_[functionName] = function(f) {
        return function() {
          loseContextIfTime();
          if (contextLost_) {
            return false;
          }
          return f.apply(ctx, arguments);
        }
      }(wrappedContext_[functionName]);
    }

    wrappedContext_.checkFramebufferStatus = function(f) {
      return function() {
        loseContextIfTime();
        if (contextLost_) {
          return wrappedContext_.FRAMEBUFFER_UNSUPPORTED;
        }
        return f.apply(ctx, arguments);
      };
    }(wrappedContext_.checkFramebufferStatus);

    wrappedContext_.getAttribLocation = function(f) {
      return function() {
        loseContextIfTime();
        if (contextLost_) {
          return -1;
        }
        return f.apply(ctx, arguments);
      };
    }(wrappedContext_.getAttribLocation);

    wrappedContext_.getVertexAttribOffset = function(f) {
      return function() {
        loseContextIfTime();
        if (contextLost_) {
          return 0;
        }
        return f.apply(ctx, arguments);
      };
    }(wrappedContext_.getVertexAttribOffset);

    wrappedContext_.isContextLost = function() {
      return contextLost_;
    };

    return wrappedContext_;
  }
}

return {
    /**
     * Initializes this module. Safe to call more than once.
     * @param {!WebGLRenderingContext} ctx A WebGL context. If
    }
   *    you have more than one context it doesn't matter which one
   *    you pass in, it is only used to pull out constants.
   */
  'init': init,

  /**
   * Returns true or false if value matches any WebGL enum
   * @param {*} value Value to check if it might be an enum.
   * @return {boolean} True if value matches one of the WebGL defined enums
   */
  'mightBeEnum': mightBeEnum,

  /**
   * Gets an string version of an WebGL enum.
   *
   * Example:
   *   WebGLDebugUtil.init(ctx);
   *   var str = WebGLDebugUtil.glEnumToString(ctx.getError());
   *
   * @param {number} value Value to return an enum for
   * @return {string} The string version of the enum.
   */
  'glEnumToString': glEnumToString,

  /**
   * Converts the argument of a WebGL function to a string.
   * Attempts to convert enum arguments to strings.
   *
   * Example:
   *   WebGLDebugUtil.init(ctx);
   *   var str = WebGLDebugUtil.glFunctionArgToString('bindTexture', 0, gl.TEXTURE_2D);
   *
   * would return 'TEXTURE_2D'
   *
   * @param {string} functionName the name of the WebGL function.
   * @param {number} argumentIndx the index of the argument.
   * @param {*} value The value of the argument.
   * @return {string} The value as a string.
   */
  'glFunctionArgToString': glFunctionArgToString,

  /**
   * Given a WebGL context returns a wrapped context that calls
   * gl.getError after every command and calls a function if the
   * result is not NO_ERROR.
   *
   * You can supply your own function if you want. For example, if you'd like
   * an exception thrown on any GL error you could do this
   *
   *    function throwOnGLError(err, funcName, args) {
   *      throw WebGLDebugUtils.glEnumToString(err) +
   *            " was caused by call to " + funcName;
   *    };
   *
   *    ctx = WebGLDebugUtils.makeDebugContext(
   *        canvas.getContext("webgl"), throwOnGLError);
   *
   * @param {!WebGLRenderingContext} ctx The webgl context to wrap.
   * @param {!function(err, funcName, args): void} opt_onErrorFunc The function
   *     to call when gl.getError returns an error. If not specified the default
   *     function calls console.log with a message.
   */
  'makeDebugContext': makeDebugContext,

  /**
   * Given a canvas element returns a wrapped canvas element that will
   * simulate lost context. The canvas returned adds the following functions.
   *
   * loseContext:
   *   simulates a lost context event.
   *
   * restoreContext:
   *   simulates the context being restored.
   *
   * lostContextInNCalls:
   *   loses the context after N gl calls.
   *
   * getNumCalls:
   *   tells you how many gl calls there have been so far.
   *
   * setRestoreTimeout:
   *   sets the number of milliseconds until the context is restored
   *   after it has been lost. Defaults to 0. Pass -1 to prevent
   *   automatic restoring.
   *
   * @param {!Canvas} canvas The canvas element to wrap.
   */
  'makeLostContextSimulatingCanvas': makeLostContextSimulatingCanvas,

  /**
   * Resets a context to the initial state.
   * @param {!WebGLRenderingContext} ctx The webgl context to
   *     reset.
   */
  'resetToInitialState': resetToInitialState
};

}();



var keyfuncs = (function() {
	var keysDown = new Uint8Array(256); 
	var keysDownOld = new Uint8Array(256); 

	cleanKeys(); 

	document.addEventListener("keydown", function(e) {
		var k = e.keyCode; 
		if(k < 256) {
			keysDown[k] = 1; 
		}
	}); 

	document.addEventListener("keyup", function(e) {
		var k = e.keyCode; 
		if(k < 256) {
			keysDown[k] = 0; 
		}
	}); 

	window.addEventListener("blur", function() { 
		cleanKeys(); 	
	});

	function cleanKeys() {
		for(var i = 0; i !== 256; i++) {
			keysDownOld[i] = 0; 
			keysDown[i] = 0; 
		}
	}

	function setOldKeyState() {
		for(var i = 0; i !== 256; i++) {
			keysDownOld[i] = keysDown[i]; 
		}
	}

	var keys = {
		"backspace":8, "tab":9, "enter":13, "shift":16, "ctrl":17, "alt":18, "pause":19, "capslock":20,
		"escape":27, "space":32, "pageUp":33, "pageDown":34, "end":35, "home":36,
		"left":37, "up":38, "right":39, "down":40, 
		"insert":45, "delete":46,
		"num0":48, "num1":49, "num2":50, "num3":51, "num4":52, "num5":53, "num6":54, "num7":55, "num8":56, "num9":57,
		"a":65, "b":66, "c":67, "d":68, "e":69, "f":70, "g":71, "h":72, "i":73, "j":74, "k":75, "l":76, "m":77, 
		"n":78, "o":79, "p":80, "q":81, "r":82, "s":83, "t":84, "u":85, "v":86, "w":87, "x":88, "y":89, "z":90, 
		"windowKeyLeft":91, "windowKeyRight":92, "select":93,
		"numpad0":96, "numpad1":97, "numpad2":98, "numpad3":99, "numpad4":100, 
		"numpad5":101, "numpad6":102, "numpad7":103, "numpad8":104, "numpad9":105,
		"multiply":106, "add":107, "subtract":109, "decimalPoint":110, "divide":111,
		"f1":112, "f2":113, "f3":114, "f4":115, "f5":116, "f6":117,
		"f7":118, "f8":119, "f9":120, "f10":121, "f11":122, "f12":123,
		"numlock":144, "scrolllock":145, "semicolon":186, "equals":187, "comma":188,
		"dash":189, "period":190, "slash":191, "graveAccent":192, "openBracket":219,
		"backSlash":220, "closeBraket":221, "quote":222
	};

	return {
		"keyIsDown" : function (key) {
			return keysDown[key] !== 0; 
		}, 
		"keyIsUp" :  function (key) {
			return keysDown[key] === 0; 
		}, 
		"keyWasPressed" : function (key) {
			return keysDown[key] !== 0 && keysDownOld[key] === 0;
		},  
		"keyWasReleased" : function (key) {
			return keysDown[key] === 0 && keysDownOld[key] !== 0;
		}, 
		"keys" : keys, 
		"setOldKeyState" : setOldKeyState, 
		"keysDown" : keysDown, 
		"keysDownOld" : keysDownOld 
	};
}());




var joyfuncs = (function () {
	var gamepads = navigator.webkitGamepads || navigator.mozGamepads || navigator.gamepads || [];
	var e = 0.2; 
	var edge0 = e; 
	var edge1 = 1 - e; 

	var NONE = {
		"axes" : new Float32Array(6), 
		"buttons" : new Float32Array(24), 
		"id" : "NONE", 
		"index" : -1 
	}; 

	var pad = NONE; 

	function update() {
		pad = updateFirstPad(); 		
	}

	function updateFirstPad() {
		for (var i = 0; i < gamepads.length; ++i) {
			var pad = gamepads[i];
			if(pad) {
				var axes = new Float32Array(pad.axes.length); 
				for(var a = 0; a < pad.axes.length; a++) { 
					if(pad.axes[a]) { 
						axes[a] = normalise(pad.axes[a]);
					}
				}

				return {
					"axes" : axes, 
					"buttons" : pad.buttons, 
					"id" : pad.id, 
					"index" : pad.index 
				};
			}
		}

		return NONE;  
	}

	function getFirstPad() {
		return pad; 
	}

	function normalise(x) {
		if(x < 0) {
			return -normalise(-x); 
		}

		// like GLSL smoothstep(x, 0, 1); 
		var t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0))); 
		return t * t * (3.0 - 2.0 * t);
	}

	return {
		"update" : update, 
		"getFirstPad" : getFirstPad  
	};
}());  



var objparse = (function() { 
	function parse(data) {
		var lines = data.split("\n"); 
	
		var vertices = []; 
		var texcoords = []; 
		var normals = []; 
		var indices = []; 

		var line; 
		var operations = {
			"v"  : v,
			"vn" : vn,
			"vt" : vt, 
			"f"  : f	
		};
	
		for(var i = 0; i < lines.length; i++) {
			line = lines[i].trim(); 
			var elements = line.split(/[\t\r\n ]+/g);
			var head = elements.shift(); 
		
			var opp = operations[head]; 
	
			if(opp) opp(elements); 
		}
	
		var ret = { vertices : new Float32Array(vertices) };
	
		if(texcoords.length !== 0) {
		if(texcoords.length * 2 !== vertices.length) {
				throw "Texture coordinates don't match vertices."; 
			}
			ret.textureCoordinates = new Float32Array(texcoords);
		}
	
		if(normals.length !== 0) {
			if(normals.length !== vertices.length) {
				throw "Normals don't match vertices."; 
			}
			ret.normals = new Float32Array(normals); 
		}
	
		if(indices.length !== 0) {
			ret.indices = new Uint16Array(indices); 
		}
	
		return ret; 
	
		function f(vertices) {
			if(vertices.length < 3) {
				throw "Strange amount of vertices in face."; 
			}

			if(vertices.length > 3) {
				//let's asume it's convex 
				for(var n = vertices.length - 1; n !== 1; n--) {
					f([vertices[0], vertices[n-1], vertices[n]]); 
				}
				return; 
			}
	
			var fa,fb,fc;
			fa = vertices[0].split(/\//g);
			fb = vertices[1].split(/\//g);
			fc = vertices[2].split(/\//g);
					
			var fav,fat,fan, fbv,fbt,fbn, fcv,fct,fcn; 
			fav = fa[0]; 
			fbv = fb[0]; 
			fcv = fc[0]; 
	
			fat = fa[1] || fav; 
			fbt = fb[1] || fbv; 
			fct = fc[1] || fcv; 
	
			fan = fa[2] || fav; 
			fbn = fb[2] || fbv; 
			fcn = fc[2] || fcv;
	
			if(!fav || !fbv || !fcv) {
				throw "wrong Face format"; 
			}
	
			if(fav !== fat || fav !== fan || 
			   fbv !== fbt || fbv !== fbn || 
			   fcv !== fct || fcv !== fcn) {
				throw "Texture and Normal Index must correspont with vertex."; 
			} 
				
			indices.push(Number(fav) -1); 
			indices.push(Number(fbv) -1); 
			indices.push(Number(fcv) -1); 
		}
	
		function v(numbers) {
			if(numbers.length !== 3) { 
				throw "vertice needs to be three elements big."; 
			}
	
			var a,b,c;
			a = Number(numbers[0]);
			b = Number(numbers[1]);
			c = Number(numbers[2]);
				
			vertices.push(a,b,c,1); 
		}

		function vn(numbers) {
			if(numbers.length !== 3) { 
				throw "normals needs to be three elements big."; 
			}
	
			var a,b,c;
			a = Number(numbers[0]);
			b = Number(numbers[1]);
			c = Number(numbers[2]);
				
			normals.push(a,b,c,0); 
		}

		function vt(uv) {
			if(uv.length !== 2) {
				throw "Texture coordinate needs two parameter."; 
			}

			var u,v; 
			u = Number(uv[0]);
			v = Number(uv[1]);
	
			texcoords.push(u,v); 
		}
	}	

	return {
		"parse" : parse 
	};
}()); 


var requestAnimationFrame = 
	window.requestAnimationFrame       || 
	window.webkitRequestAnimationFrame || 
	window.mozRequestAnimationFrame    || 
	window.oRequestAnimationFrame      || 
	window.msRequestAnimationFrame     || 
	function( callback ){
		window.setTimeout(callback, 1000 / 60);
	};

function createContext(width, height, node) { 	
		var canvas;
		node = node || document.body;  
		canvas = document.createElement("canvas"); 
		canvas.width = width; 
		canvas.height = height; 
		node.appendChild(canvas); 

		var gl = WebGLDebugUtils.makeDebugContext(canvas.getContext("experimental-webgl", {alpha : false, preserveDrawingBuffer : true}).getSafeContext()); 

		return gl; 
}

function getSource(id) {
    var node = document.getElementById(id); 
    return node.innerText; 
}

function createCube() {
	var vert = new Float32Array([
		-1, -1,  1, 1,
		 1, -1,  1, 1,
		 1,  1,  1, 1,
		-1,  1,  1, 1,
		-1, -1, -1, 1,
		 1, -1, -1, 1,
		 1,  1, -1, 1,
		-1,  1, -1, 1
	]); 

	var n = 0.577350269; //sqrt(3) / 3

	var norm = new Float32Array([
		-n, -n,  n, 0,
		 n, -n,  n, 0,
		 n,  n,  n, 0,
		-n,  n,  n, 0,
		-n, -n, -n, 0,
		 n, -n, -n, 0,
		 n,  n, -n, 0,
		-n,  n, -n, 0
	]); 

	var indx = new Uint16Array([
		0,1,2,
		0,2,3,
		1,5,6,
		1,6,2,
		5,4,7,
		5,7,6,
		4,0,3,
		4,3,7,
		3,2,6,
		3,6,7,
		4,5,1,
		4,1,0
	]);

	return { vertices : vert, indices : indx, normals : norm };
}

function createPlane(level) {
    var vert = [];
    var tex = [];  

    createTriangle(vert, tex, [1,0,1], [-1,0,1], [-1,0,-1], [1,1], [0,1], [0,0], level || 0); 
    createTriangle(vert, tex, [1,0,1], [-1,0,-1], [1,0,-1], [1,1], [0,0], [1,0], level || 0); 

    return { vertices : new Float32Array(vert), texCoords : new Float32Array(tex) }; 

    function createTriangle(vert, tex, v1, v2, v3, t1, t2, t3, n) { 
        if(n === 0) {
            vert.push(v1[0], v1[1], v1[2], 1.0); 
            vert.push(v2[0], v2[1], v2[2], 1.0); 
            vert.push(v3[0], v3[1], v3[2], 1.0); 

            tex.push(t1[0], t1[1]); 
            tex.push(t2[0], t2[1]); 
            tex.push(t3[0], t3[1]); 

            return; 
        }

        var v12 = middleVec(v1, v2); 
        var v23 = middleVec(v2, v3); 
        var v31 = middleVec(v3, v1); 

        var t12 = middleTex(t1, t2); 
        var t23 = middleTex(t2, t3); 
        var t31 = middleTex(t3, t1); 

        createTriangle(vert, tex, v1, v12, v31, t1, t12, t31, n-1); 
        createTriangle(vert, tex, v2, v23, v12, t2, t23, t12, n-1); 
        createTriangle(vert, tex, v3, v31, v23, t3, t31, t23, n-1); 
        createTriangle(vert, tex, v12, v23, v31, t12, t23, t31, n-1); 

        function middleVec(v1, v2) {
            var x1,y1,z1,x2,y2,z2; 
            x1 = v1[0]; 
            y1 = v1[1]; 
            z1 = v1[2]; 
            x2 = v2[0]; 
            y2 = v2[1]; 
            z2 = v2[2]; 

            return [ (x1 + x2) / 2,  (y1 + y2) / 2,  (z1 + z2) / 2 ]; 
        }

        function middleTex(t1, t2) {
            var x1,y1,x2,y2; 

            x1 = t1[0];
            y1 = t1[1]; 
            x2 = t2[0];
            y2 = t2[1]; 

            return [ (x1 + x2) / 2, (y1 + y2) / 2 ]; 
        }
    }
}

var requestGameFrame = (function() {
	var starttime = -1; 
	var lasttime = 0;

	var time = {
		"delta" : 0, 
		"total" : 0
	};

	var loopObject = {
		"time" : time, 
		"frame" : 0, 
		"reset" : reset 
	};
	
	function reset() {
		starttime = -1;  
	}

	return function (callback) { 
		requestAnimationFrame(function () {
			var now = Date.now(); 
			if(starttime === -1) {
				lasttime = now;
				starttime = now; 
				loopObject.frame = 0; 
			}

			time.delta = (now - lasttime) / 1000.0; 
			time.total = (now - starttime) / 1000.0; 

			joyfuncs.update(); 

			callback(loopObject); 

			keyfuncs.setOldKeyState(); 
			lasttime = now; 
			loopObject.frame++;
		}); 
	};
}()); 

var shapes = {
	"createPlane" : createPlane, 
	"createCube" : createCube, 
};

// UTIL.keys.x.down
// UTIL.keys.x.up
// UTIL.keys.x.pressed
// UTIL.keys.x.released

var keys = {
	codes : function() { return keyfuncs.keys; }, 
	isDown : function() { return keyfuncs.keyisDown; }, 
	isUp : function() { return keyfuncs.keyisUp; }, 
	wasPressed : function() { return keyfuncs.keyWasPressed; }, 
	wasReleased : function() { return keyfuncs.keyWasReleased; } 
};

for(var kn in keyfuncs.keys) {
	(function(keyname, keycode) { 
		var funcs = {
			down : function() { return keyfuncs.keyIsDown(keycode); },
			up : function() { return keyfuncs.keyIsUp(keycode); },
			pressed : function() { return keyfuncs.keyWasPressed(keycode); },
			released : function() { return keyfuncs.keyWasReleased(keycode); },
		}; 

		Object.defineProperty(keys, keyname, {
			"get" : function() { return funcs; }  
		});
	}(kn, keyfuncs.keys[kn])); 
} 

var gamepads = {
	"first" : joyfuncs.getFirstPad
};

var obj = {
	"parse" : objparse.parse
}

return {
	"requestGameFrame" : requestGameFrame, 
	"createContext" : createContext,
	"getSource" : getSource,  
	"shapes" : shapes,
	"obj" : obj, 
	"keys" : keys,
	"gamepads" : gamepads
}; 
}()); 


var SHAPES = (function() {
	var module = {}; 

	module.createLayer = function (gl, projection) { 
	    var vPositionIndx = 0; 
	    var vColorIndx = 1; 
	    var vTransIndx = 2; 
		var modelview = mat4.identity();
		var alpha = 0; 
	
	    var vShaderSrc = UTIL.getSource("shader.vs");
	    var fShaderSrc = UTIL.getSource("shader.fs");
	
	    var vertexShader = gl.createShader(gl.VERTEX_SHADER); 
	    gl.shaderSource(vertexShader, vShaderSrc); 
	    gl.compileShader(vertexShader); 
	
	    var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER); 
	    gl.shaderSource(fragmentShader, fShaderSrc); 
	    gl.compileShader(fragmentShader); 
	
	    var program = gl.createProgram(); 
	
	    gl.attachShader(program, vertexShader); 
	    gl.attachShader(program, fragmentShader); 
	    gl.linkProgram(program); 
	
	    gl.bindAttribLocation(program, vPositionIndx, "vPosition"); 
	
	    gl.useProgram(program); 
	
	    //Vertices
	    var plane = UTIL.shapes.createPlane(2); 
	    var vertices = plane.vertices; 
	    var texCoords = plane.texCoords; 
	
		for(var i=0; i < texCoords.length; i+=2) {
			texCoords[i] = texCoords[i] * 8.; 
			texCoords[i+1] = texCoords[i+1] * 8.; 
		}
	
	    program.numVertices = vertices.length / 4; 
	
	    var posbuffer = gl.createBuffer(); 
	
	    gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer);
	    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
	
	    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); 
	    gl.enableVertexAttribArray(0); 
	
	    //Texture
	    var texbuffer = gl.createBuffer(); 
	
	    gl.bindBuffer(gl.ARRAY_BUFFER, texbuffer);
	    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
	
	    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0); 
	    gl.enableVertexAttribArray(1); 
	
	    var texture = gl.createTexture(); 
	    var image = new Image(); 
	    image.onload = function() {
	        gl.bindTexture(gl.TEXTURE_2D, texture);
	        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
	        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	        gl.bindTexture(gl.TEXTURE_2D, null);
	    };
	    image.src = "textures/seaweed1.png"; 
	
	    program.texture = texture; 
	
	    gl.bindBuffer(gl.ARRAY_BUFFER, null);
	    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	
		return {
			"draw" : function(camera) {
				gl.useProgram(program); 
	
				//TEST 			
	    		gl.enableVertexAttribArray(0); 
	 		    gl.enableVertexAttribArray(1); 
	
				mat4.identity(modelview); 
	
				mat4.multiply(modelview, camera); 
				mat4.rotateY(modelview, alpha); 
				mat4.rotateX(modelview, Math.PI / 2); 
				mat4.scale(modelview, [10,1,10]); 
						
				//var proj = mat4.identity(); 
				//mat4.inverse(eye, proj); 
				//mat4.multiply(eye, projection, proj); 
	
				var vModelViewIndx = gl.getUniformLocation(program, "vModelView");
				gl.uniformMatrix4fv(vModelViewIndx, false, modelview);
	
				var vProjectionIndx = gl.getUniformLocation(program, "vProjection");
				gl.uniformMatrix4fv(vProjectionIndx, false, projection);
	
				//var vEyeIndx = gl.getUniformLocation(program, "vEye");
				//gl.uniformMatrix4fv(vEyeIndx, false, eye);
				var fTexIndx = gl.getUniformLocation(program, "texture");
	
				gl.activeTexture(gl.TEXTURE0);
				gl.bindTexture(gl.TEXTURE_2D, program.texture);
				gl.uniform1i(fTexIndx, 0);
	
				gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer); 
				gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); 
	    		gl.enableVertexAttribArray(0); 
	
				gl.drawArrays(gl.TRIANGLES, 0, program.numVertices); 
	
			    gl.bindBuffer(gl.ARRAY_BUFFER, null);
			}, 
			"update" : function(milis) {
				var a = milis * 2 * Math.PI / 1000;
	
				if(UTIL.keys.q.down) { 
					alpha += a; 
				}
	
				/*if(UTIL.keyIsDown(UTIL.keys.e)) { 
					alpha -= a; 
				}*/
			}
		};	
	}
	
	


	return module; 
}());


// Setup stuff for event handling.
Function.prototype.bind = function(obj) {
    var method = this;
    return function() {
        args = [this];
        for(var i = 0; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return method.apply(obj, args);
    }
}

// Namespace.

var aquarium = {};
aquarium.initial_fishes = 5;
aquarium.max_boids = 20;
aquarium.max_bubbles = 10;

aquarium.WebGLRenderer = function(canvas_id, root) {
    aquarium.Renderer.call(this, root);
    this.canvas = document.getElementById(canvas_id);
	//gl = WebGLDebugUtils.makeDebugContext(this.canvas.getContext("experimental-webgl", {alpha : false, preserveDrawingBuffer : true}).getSafeContext()); 
	gl = this.canvas.getContext("experimental-webgl", {alpha : true, preserveDrawingBuffer : true}); 

	gl.enable( gl.DEPTH_TEST );
	gl.depthFunc( gl.LEQUAL );
	gl.enable( gl.BLEND );
	gl.blendFunc( gl.FUNC_ADD, null ); // <-- Duh?! 
	gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );

   	var camPos = vec3.create([0, 0, 0.7]);
	var camNormal = vec3.create([0,0,-1]); 
	var camDir = vec3.create([0,0,0]); 
	var camUp = vec3.create([0,1,0]); 
	var camera = mat4.lookAt(camPos, vec3.add(camPos, camNormal, camDir), camUp);
	var projection = mat4.perspective(75, 4/3, 0.1, 8); 
	var identity = mat4.identity(); 
	var canvasWidth = 1024; 
	var canvasHeight = 600; 

	var renderEntity = getRenderFunc(projection); 
	var render = true; 

	var zDepth =[];
	var z = -1; 
	zDepth[aquarium.FeatureType] = z += 0.2; 
	zDepth[aquarium.FoodType] = z += 0.2; 
	zDepth[aquarium.BoidType] = z += 0.2; 
	zDepth[aquarium.BubbleType] = z += 0.2; 
	zDepth[aquarium.ButtonType] = z += 0.2; 


    this.render = function() {
		if(UTIL.keys.p.released) {
			render = !render; 
		}

		if(render) {
			clear(gl); 	
			if(UTIL.keys.w.down()) {
				camPos[2] += 0.1; 
				camera = mat4.lookAt(camPos, vec3.add(camPos, camNormal, camDir), camUp);
				console.log(camPos); 
			}
			if(UTIL.keys.s.down()) {
				camPos[2] -= 0.1; 
				camera = mat4.lookAt(camPos, vec3.add(camPos, camNormal, camDir), camUp);
				console.log(camPos); 
			}
			if(UTIL.keys.a.down()) {
				camPos[0] -= 0.1; 
				camera = mat4.lookAt(camPos, vec3.add(camPos, camNormal, camDir), camUp);
				console.log(camPos); 
			}
			if(UTIL.keys.d.down()) {
				camPos[0] += 0.1; 
				camera = mat4.lookAt(camPos, vec3.add(camPos, camNormal, camDir), camUp);
				console.log(camPos); 
			}
			this.world.render(); 

			//Draw Background 			
			var bgtex = this.resource.entries.textures["bg"];
			renderEntity({ "camera" : camera, "projection" : identity, "texture" : bgtex, "position" : {"x" : 0, "y" : 0}, "size" : 700, "zDepth" : -1.1 });

			for(var i = 0, e; e = this.world.entities[i]; i++){
				// {pos, size, direction, speed, Age, sex }
				// {texture, center, width, height}
				var texture = this.resource.entries.textures[e.resource_id];
				//console.log("entry: " + e.resource_id); 
				renderEntity({ "camera" : camera, "projection" : projection, "texture" : texture, "position" : e.pos, "size" : e.size, "zDepth" : zDepth[e.type], "type" : e.type });
			}

			return 2;
		}
		return 1; 
    }

    this.add_frame_callback(this.render.bind(this));

	this.setup = function() {
		console.log("setup"); 
		for(var resourceId in this.resource.entries.textures){
			console.log("load: " + resourceId); 
            var image = this.resource.entries.textures[resourceId];
			// {texture, center}
			var glTexture = gl.createTexture(); 

			gl.bindTexture(gl.TEXTURE_2D, glTexture);
			//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.bindTexture(gl.TEXTURE_2D, null);

			this.resource.entries.textures[resourceId] =  glTexture; 
        }
	
		this.frame(); 
	}; 

	function getRenderFunc() {
		var vPositionIndx = 0; 
		var vColorIndx = 1; 
		var vTransIndx = 2; 

		var vShaderSrc = UTIL.getSource("shader.vs"); 
		var fShaderSrc = UTIL.getSource("shader.fs"); 

		var vertexShader = gl.createShader(gl.VERTEX_SHADER);
		gl.shaderSource(vertexShader, vShaderSrc);
		gl.compileShader(vertexShader);
		console.log( gl.getShaderInfoLog(vertexShader) ); 

		var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
		gl.shaderSource(fragmentShader, fShaderSrc);
		gl.compileShader(fragmentShader);
		console.log( gl.getShaderInfoLog(fragmentShader) ); 

		var program = gl.createProgram();

		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		gl.linkProgram(program);	
		console.log( gl.getProgramInfoLog(program) ); 

		var plane = UTIL.shapes.createPlane(0); 
		var vertices = plane.vertices; 
		var texCoords = plane.texCoords; 
		program.numVertices = vertices.length / 4; 

		//Vertices
		var posbuffer = gl.createBuffer(); 
		gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer); 
		gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW); 
		gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); 
		gl.enableVertexAttribArray(0); 		

		//texture koordinaten 
		var texbuffer = gl.createBuffer(); 
		gl.bindBuffer(gl.ARRAY_BUFFER, texbuffer); 
		gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW); 	
		gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0); 
		gl.enableVertexAttribArray(1); 		

		gl.useProgram(program); 
		//gl.enableVertexAttribArray(0); 
		//gl.enableVertexAttribArray(1); 		
		var fTexIndx = gl.getUniformLocation(program, "texture"); 
		var vProjectionIndx = gl.getUniformLocation(program, "vProjection");
		gl.uniformMatrix4fv(vProjectionIndx, false, projection);

		return function(info) {
			// {pos, size, direction, speed, Age, sex }
			// {texture, center, width, height}
			var modelview = mat4.identity(); 
			mat4.multiply(modelview, info.camera); 
			mat4.translate(modelview, [ info.position.x / (canvasWidth / 2), - (info.position.y / (canvasHeight / 2)), info.zDepth]); 	
			if(info.type === aquarium.BoidType) {
				mat4.rotateY(modelview, Math.sin(Date.now() / 200) * Math.PI / 6); 
			}


			mat4.scale(modelview, [info.size / 300 ,info.size / 300 ,1]);

			mat4.rotateX(modelview, Math.PI / 2); 
		
			gl.useProgram(program); 
			gl.enableVertexAttribArray(0); 
			gl.enableVertexAttribArray(1); 		

			var vModelViewIndx = gl.getUniformLocation(program, "vModelView");
			gl.uniformMatrix4fv(vModelViewIndx, false, modelview);

			gl.bindTexture(gl.TEXTURE_2D, info.texture);
			gl.uniform1i(fTexIndx, 0); 
			gl.bindBuffer(gl.ARRAY_BUFFER, posbuffer); 
			gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 0, 0); 
			gl.enableVertexAttribArray(0); 
			gl.drawArrays(gl.TRIANGLES, 0, program.numVertices); 

			gl.bindTexture(gl.TEXTURE_2D, null);
		};
	}

	function clear(gl) {
    	gl.viewport(0, 0, canvasWidth, canvasHeight); 
	    gl.clearColor(97 / 256, 149 / 256, 237 / 256, 1); 
	    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
		gl.enable(gl.DEPTH_TEST); 
	}
}





// --- Convenience methods.
aquarium.create_fish = function(world, x, y, value) {
    // Create a fish and select its characterists from FishTypes based on its
    // value.
    var new_value = Math.min(aquarium.uniform(value / 2, value), 
            world.fish_types.length);
    var entry = world.fish_types[Math.floor(new_value)];
    var resource_id = entry[0];
    var resource = entry[1];

    var max_age = aquarium.uniform(resource.max_age[0], resource.max_age[1]);
    var energy = aquarium.uniform(resource.energy[0], resource.energy[1]);
    var avg_speed = aquarium.uniform(
            resource.avg_speed[0], resource.avg_speed[1]);
    var breed_time = aquarium.uniform(
            resource.breed_time[0], resource.breed_time[1]);
    var size = aquarium.uniform(resource.size[0], resource.size[1]);

    return new aquarium.Boid(world,
            x, y, resource_id, new_value, size, max_age, energy, avg_speed, breed_time);
}

aquarium.distance = function(x, y) {
    // Returns the distance of a vector to the origin.
    return Math.sqrt(x * x + y * y);
}

aquarium.angle_between = function(a_x, a_y, b_x, b_y) {
    // Returns the angle between two vectors.
    var d = aquarium.distance(a_x, a_y) * aquarium.distance(b_x, b_y);
    if(d < 0.01) return 0;
    return Math.acos((a_x * b_x + a_y * b_y) / d);
}

aquarium.uniform = function(a, b) {
    // Convenience method to return a float between a and b.
    return a + Math.random() * (b - a);
}

aquarium.delta = function(p1, p2) {
    // Difference between two vectors.
    return new aquarium.Point(p2.x - p1.x, p2.y - p1.y);
}

aquarium.scale = function(p1, s) {
    // Returns a scaled instance of a vector.
    return new aquarium.Point(p1.x * s, p1.y * s);
}

// --- Classes.
aquarium.Point = function(x, y) {
    // A generic vector with some utility functions.
    this.x = x;
    this.y = y;

    this.len = function() {
        return aquarium.distance(this.x, this.y);
    }

    this.add = function(other) {
        this.x += other.x; this.y += other.y;
    }

    this.scale = function(a) {
        this.x *= a; this.y *= a;
        return this;
    }

    this.reset = function() {
        this.x = 0; this.y = 0;
    }

    this.normalize = function() {
        var l = this.len();

        if(l > 0.01) {
            this.x /= l; this.y /= l;
        } else {
            this.x = 0; this.y = 0;
        }
    }

    this.str = function() {
        return this.x.toFixed(2) + ", " + this.y.toFixed(2);
    }
}

aquarium.Entity = function(world, x, y, size, resource_id) {
    // The base class for visual objects like food, fishes and bubbles.
    this.type = undefined;

    this.world = world;
    this.pos = new aquarium.Point(x, y);
    this.size = size;
    this.direction = new aquarium.Point(0, 0);
    this.speed = 0;
    this.resource_id = resource_id;
    // TODO Mittelpunkt


    this.move = function() {
        this.pos.add(this.direction);
    }

    this.alive = function() {
        return true;
    }
}

aquarium.Feature = function(world, x, y, size, resource_id) {
    aquarium.Entity.call(this, world, x, y, size, resource_id);
    this.type = aquarium.FeatureType;
}

aquarium.Button = function(world, x, y, size, resource_id, callback) {
    aquarium.Entity.call(this, world, x, y, size, resource_id);
    this.type = aquarium.ButtonType;
    this.callback = world[callback].bind(world);
}

aquarium.Food = function(world, x, y, resource_id) {
    // Food to be eaten by fishes.
    aquarium.Entity.call(this, world, x, y, aquarium.uniform(20, 30), resource_id);
    this.type = aquarium.FoodType;

    this.direction = new aquarium.Point(0, 1);
    this.speed = aquarium.uniform(2, 4);

    this.alive = function() {
        return (
            this.size > 0 &&
            this.pos.y < (this.world.height * 0.5) * 0.9
        );
    }

    this.eat = function() {
        var amount = Math.min(this.size, 0.1);
        this.size -= amount;
        return amount * 50;
    }
}

aquarium.Bubble = function(world, x, y, size, speed, resource_id) {
    // Just a bubble.
    aquarium.Entity.call(this, world, x, y, size, resource_id);

    this.type = aquarium.BubbleType;

    this.direction = new aquarium.Point(0, -1);
    this.speed = speed;

    this.alive = function() {
        return this.pos.y > -this.world.height * 0.6;
    }
}

aquarium.Boid = function(world, x, y, pixmap, value, size, max_age, energy, average_speed,
        breed_time) {
    // A boid that models the fishes behavior.
    aquarium.Entity.call(this, world, x, y, size * 0.5, pixmap);

    this.value = value;
    this.average_speed = average_speed;
    this.energy = energy;
    this.max_age = max_age;
    this.breed_time = breed_time;
    this.type = aquarium.BoidType;

    this.acceleration = 0;
    this.speed = this.average_speed;
    this.age = 0;
    this.next_breed = this.breed_time;
    this.age_stage = 0;

    this.max_size = size;
    this.fov_radius = this.size * 5;

    this.sex = Math.random() > 0.5 ? Female : Male;

    this.randomize_step = 0;
    this.food_target = undefined;
    this.courtshipping = undefined;

    this.separation = new aquarium.Point(0, 0);
    this.cohesion = new aquarium.Point(0, 0);
    this.alignment = new aquarium.Point(0, 0);

    this.paint_entity = this.paint;

    this.paint = function(painter) {
        this.paint_entity(painter);

        if(!ShowInfo) return;

        r = this.fov_radius;

        if(this.visible > 0)
            painter.pen = red_pen;
        painter.drawEllipse(-r, -r, r*2, r*2);
        painter.pen = red_pen;
        painter.drawLine(0, 0, this.separation.x * r, this.separation.y * r);
        painter.pen = blue_pen;
        painter.drawLine(0, 0, this.cohesion.x * r, this.cohesion.y * r);
        painter.pen = green_pen;
        painter.drawLine(0, 0, this.alignment.x * r, this.alignment.y * r);
        painter.pen = white_pen;
        painter.drawLine(0, 0, this.direction.x * r, this.direction.y * r);
    }

    this.perceives = function(other, dist) {
        if(dist > this.fov_radius) return false;

        var fov_angle = aquarium.angle_between(
                -this.direction.x, -this.direction.y,
                other.pos.x - this.pos.x, other.pos.y - this.pos.y);

        return fov_angle > 0.4;
    }

    this.think = function(neighbors) {
        var separation = new aquarium.Point(0, 0);
        var cohesion = new aquarium.Point(0, 0);
        var alignment = new aquarium.Point(0, 0);

        var visible = 0;
        var other_courtshipping = undefined;
        var food_target_dist = undefined;

        for(var i=0, info; info=neighbors[i]; i++) {
            var other = info[0], dist = info[1];

            switch(other.type) {
                case aquarium.BoidType:
                    if(other.courtshipping == this) {
                        other_courtshipping = this;
                    } else if(this.next_breed == 0 && this.energy > 0) {
                        if(
                                this.courtshipping == undefined &&
                                other.sex != this.sex) {
                            this.courtshipping = other;
                        }
                    }

                    // Flocking behaviour ignores fishes of a different species.
                    if(Math.floor(this.value) != Math.floor(other.value)) {
                        continue;
                    }
                    visible++;

                    // Separation
                    if(dist < 0.01) {
                        separation.x += Math.random();
                        separation.y += Math.random();
                    } else {
                        separation.add(
                                aquarium.delta(other.pos, this.pos).scale(
                                        1 / dist - 1 / this.fov_radius));
                    }

                    // Cohesion
                    cohesion.add(
                            aquarium.delta(this.pos, other.pos).scale(
                                    1 / this.fov_radius));

                    // Alignment
                    alignment.add(other.direction);
                break;
                case aquarium.FoodType:
                    if(
                            this.food_target == undefined || 
                            food_target_dist > dist) {
                        this.food_target = other;
                        food_target_dist = dist;
                    }
                break;
            }
        }

        var direction = new aquarium.Point(0, 0);

        // Direction from flocking behaviour.
        if(visible > 0) {
            direction.add(new aquarium.Point(
                    (separation.x + cohesion.x + alignment.x) / (3 * visible),
                    (separation.y + cohesion.y + alignment.y) / (3 * visible)));
        } else {
            direction.add(this.direction);
        }

        if(this.randomize_step > 0) {
            this.randomize_step--;
        } else {
            this.randomize_step = 10 + Math.floor(Math.random() * 10);
            var explore_dir = new aquarium.Point(
                    (0.5 - Math.random()) * 2, (0.5 - Math.random()) * 2);
            direction.scale(0.2).add(explore_dir.scale(0.8));

            this.acceleration += (0.5 - Math.random()) * 0.5;
        }

        if(this.food_target != undefined) {
            var food_dir = aquarium.delta(this.pos, this.food_target.pos);
            direction.scale(0.4).add(food_dir.scale(0.6));
            this.acceleration = 1;

            // Eat.
            if(food_dir.len() < this.size) {
                amount = this.food_target.eat();
                this.food_target = undefined;
                this.energy += amount;
            } else if(!this.food_target.alive()) {
                this.food_target = undefined;
            }
        }

        if(other_courtshipping != undefined) {
            var flee_dir = aquarium.delta(this.pos, other_courtshipping.pos).scale(-1);
            direction.scale(0.1).add(flee_dir.scale(0.9));
            this.acceleration = 1;
        }

        if(this.courtshipping != undefined) {
            var chase_dir = aquarium.delta(this.pos, this.courtshipping.pos);
            direction.scale(0.1).add(chase_dir.scale(0.9));
            this.acceleration = 1;
            if(this.energy <= 0) {
                this.courtshipping = undefined;
            } else if(chase_dir.len() < this.size) {
                this.next_breed = this.breed_time;
                // Only add new boids if the upper limit is not reached.
                if(this.world.count_fishes() < aquarium.max_boids) {
                    this.world.add_entity(aquarium.create_fish(
                            this.world, this.pos.x, this.pos.y,
                            this.value + this.courtshipping.value));
                }
                this.courtshipping = undefined;
            }
        }

        // Force boids back to the center of the fishbowl if they are to close
        // to the edge.
        var dist_center = this.pos.len();
        var rel_dist_center = dist_center /
                (Math.min(this.world.width, this.world.height) * 0.5);

        if(rel_dist_center > 0.9) {
            direction = aquarium.scale(this.pos, -1);
        }

        // Acceleration is decreasing over time.
        this.acceleration *= 0.9;

        this.speed = 0.5 * this.speed +
            this.average_speed * (1 + this.acceleration * 0.5) * 0.5;
        this.energy = Math.max(0, this.energy - this.speed / 10);
        if(this.energy == 0)
            this.speed = Math.min(this.average_speed, this.speed);

        // Normalize direction.
        direction.normalize();

        // y doesn't sum up to one which will let the boids tend to swim
        // horizontally.
        this.direction.x = 0.75 * this.direction.x + 0.25 * direction.x;
        this.direction.y = 0.75 * this.direction.y + 0.225 * direction.y;

        this.age++;
        if(Math.ceil((this.age / this.max_age) * AgeStages) > this.age_stage) {
            this.age_stage++;
            this.size = this.max_size * (0.5 + this.age_stage / AgeStages / 2);
        }

        this.next_breed = Math.max(this.next_breed - 1, 0);

        // Store values just in case they should be visualized.
        this.separation = separation;
        this.cohesion = cohesion;
        this.alignment = alignment;
    }

    this.str = function() {
        return "(" + this.pos.str() + ")";
    }

    this.alive = function() {
        return this.age < this.max_age;
    }
}

aquarium.FeatureType = 0;
aquarium.BoidType = 1;
aquarium.FoodType = 2;
aquarium.BubbleType = 3;
aquarium.ButtonType = 4;

aquarium.World = function(renderer) {
    this.renderer = renderer;
    this.width = renderer.canvas.width;
    this.height = renderer.canvas.height;

    // Constants.
    var BubbleTime = 2000;
    var MinAutofeedTime = 2000, MaxAutofeedTime = 5000;
    var AutobuyTime = 2000;

    Male = 0; Female = 1;
    MinBoidSize = 0.5;
    AgeStages = 10;
    ShowInfo = false;

    // Container for all entities.
    this.entities = [];
    this.new_entities = [];
    this.distances = [];

    this.score = 0;
    this.hiscore = 0;

    this.features = [];

    this.update_timestep = 1 / 10;

    this.create_default_fish = function() {
        var x_max = this.width / 2;
        var y_max = this.height / 2;
        var fish = aquarium.create_fish(this,
                aquarium.uniform(-x_max, x_max), aquarium.uniform(-y_max, y_max),
                Math.random());
        return fish;
    }

    this.get_distance = function(a, b) {
        // Returns the distance from entity with index a to the entity with
        // index b.
        if(a > b) {
            var t = a;
            a = b;
            b = t;
        }

        index = (a * (this.entities.length - 1) -
                Math.floor((a - 1) * a * 0.5) + b - a - 1);

        return this.distances[index];
    }

    this.check_bubbles = function() {
        var bubbles = 0;
        for(var i=0, entity; entity=this.entities[i]; i++) {
            if(entity.type == aquarium.BubbleType) 
                bubbles++;
        }

        var random_y = bubbles == 0;

        while(bubbles < aquarium.max_bubbles) {
            var bubble_type = this.bubble_types[
                    Math.floor(aquarium.uniform(0, this.bubble_types.length))][1];
            var pos_x = aquarium.uniform(-this.width / 2, this.width / 2);
            if(!random_y) {
                var pos_y = this.height / 2;
            } else {
                var pos_y = aquarium.uniform(-this.height / 2, this.height / 2);
            }

            var size = aquarium.uniform(bubble_type.size[0], bubble_type.size[1])
            var speed = aquarium.uniform(bubble_type.speed[0], bubble_type.speed[1])
            this.add_entity(new aquarium.Bubble(this,
                        pos_x, pos_y, size, speed, bubble_type.texture));
            bubbles++;
        }
        return 30;
    }

    this.step = function() {
        // Collect dead entities.
        var dead = [];

        for(var i=0, entity; entity=this.entities[i]; i++) {
            if(entity.alive()) continue;

            dead.push(i);
        }

        dead.reverse();
        // Strange, this doesn't work with the above iteration style.
        for(var i=0; i<dead.length; i++) {
            this.entities.splice(dead[i], 1);
        }

        // Add new entities.
        for(var i=0,entity; entity=this.new_entities[i]; i++) {
            this.entities.push(entity);
        }
        this.new_entities = [];

        // Update distances between entities.
        this.distances = [];

        if(this.entities.length == 0) return;

        for(var a=0, boid_a; boid_a=this.entities[a]; a++) {
            for(var b=a+1, boid_b; boid_b=this.entities[b]; b++) {
                // Calculate distance between boid a and b.
                this.distances.push(aquarium.delta(boid_a.pos, boid_b.pos).len());
           }
        }

        this.score = 0;
        for(var i=0, entity; entity=this.entities[i]; i++) {
            // Ignore entities which can't think.
            if(entity.think == undefined) continue;

            var neighbors = [];

            for(var j=0, other; other=this.entities[j]; j++) {
                if(other == entity) continue;
                dist = this.get_distance(i, j);
                if(!entity.perceives(other, dist)) continue;

                neighbors.push([other, dist]);
            }

            entity.think(neighbors);
            this.score += entity.value;
        }

        if(this.score > this.hiscore) {
            this.hiscore = this.score;
        }

        return 10;
    }

    this.render = function() {
        for(var i=0, entity; entity=this.entities[i]; i++) {
            entity.pos.add(aquarium.scale(
                    entity.direction, entity.speed * this.update_timestep));
        }
    }
        
    this.add_entity = function(entity) {
        this.new_entities.push(entity);
    }

    this.count_fishes = function() {
        var count = 0;
        for(var i = 0, e; e = this.entities[i]; i++) {
            if(e.think != undefined) {
                count++;
            }
        }
        return count;
    }

    this.rebuild_features = function(feature_count) {
        // Calculate sum of weights.
        var sum_weights = 0;
        for(var i = 0,f; f=this.feature_types[i]; i++) {
            sum_weights += f[1].probability;
        }

        // Rebuild features.
        var vary_x = (1 / feature_count) * 0.5;
        for(var i = 0; i < feature_count; i++) {
            // Select a feature index i.
            var j, r = aquarium.uniform(0, sum_weights), current = 0;
            for(j = 0; j < this.feature_types.length; j++) {
                current += this.feature_types[j][1].probability;
                if(r <= current) break;
            }

            var pos_x = (i / feature_count + vary_x * Math.random()) *
                    this.width - this.width / 2;

            var feature_type = this.feature_types[j][1];
            var size = aquarium.uniform(feature_type.size[0], feature_type.size[1]);
            this.add_entity(new aquarium.Feature(this,
                        pos_x, this.height / 2, size, this.feature_types[j][0]));
        }
    }

    this.autobuy = function() {
        if(this.count_fishes() < aquarium.initial_fishes) {
            this.add_entity(create_default_fish());
        }
        return 20;
    }

    this.start_food_drag = function(x, y) {
        food = new aquarium.Food(this, x, y, 'food');
        this.add_entity(food);
        var shift_x = this.renderer.canvas.offsetLeft + this.width / 2;
        var shift_y = this.renderer.canvas.offsetTop + this.height / 2;

        function drag(evt) {
            food.pos.x = evt.pageX - shift_x;
            food.pos.y = evt.pageY - shift_y;
        }
        this.renderer.addEventListener('mousemove', drag);
        this.renderer.addEventListener('mouseup', (function() {
            this.renderer.removeEventListener('mousemove', drag)
        }).bind(this));
    }

    this.mousedownhandler = (function(bla, evt) {
		console.log("mousedown");
        var x = evt.pageX - this.renderer.canvas.offsetLeft - this.width / 2;
        var y = evt.pageY - this.renderer.canvas.offsetTop - this.height / 2;
        var rel_x = (evt.pageX - this.renderer.canvas.offsetLeft) / this.width;
        var rel_y = (evt.pageY - this.renderer.canvas.offsetTop) / this.height;
        for(var i = 0, e; e = this.entities[i]; i++) {
            if(e.type == aquarium.ButtonType) {
                if(rel_x >= e.pos.x && rel_x <= e.pos.x + e.size &&
                        rel_y >= e.pos.y && rel_y <= e.pos.y + e.size) {
                    e.callback(x, y);
                }
            }
        }
    }).bind(this);

    this.mouseuphandler = (function() {
        console.log('up');
        this.renderer.removeEventListener('mousemove', this.mousemotionhandler);
    }).bind(this);

    this.mousemotionhandler = (function(evt) {
        console.log('motion ' + evt);
    }).bind(this);

    this.initialize = function(renderer) {
        this.renderer = renderer;
        console.log('initialize');
        this.renderer.addEventListener('mousedown', this.mousedownhandler);
    }

    this.setup = function() {
        this.feature_types = [];
        this.fish_types = [];
        this.bubble_types = [];

        for(var type in this.renderer.resource.entries.types) {
            var types = this.renderer.resource.entries.types[type];

            if(type == 'fish') {
                for(var name in types) { 
                    var entry = types[name];
                    this.fish_types.push([name, entry]);
                }
            } else if(type == 'feature') {
                for(var name in types) { 
                    var entry = types[name];
                    this.feature_types.push([name, entry]);
                }
            } else if(type == 'bubble') {
                for(var name in types) { 
                    var entry = types[name];
                    this.bubble_types.push([name, entry]);
                }
            }
        }

        this.rebuild_features(10);
        this.check_bubbles(true);

        // Add buttons.
        for(var buttonname in this.renderer.resource.entries.scenario.buttons) {
            console.log('button ' + buttonname);
            var button = this.renderer.resource.entries.scenario.buttons[buttonname];

            this.add_entity(new aquarium.Button(this, button.pos[0], button.pos[1],
                        button.size, button.texture, button.callback));
        }

        // Add initial fishes.
        console.log('adding fishes ' + aquarium.initial_fishes);
        for(var i = 0; i < aquarium.initial_fishes; i++) {
            this.add_entity(this.create_default_fish());
        }

        this.renderer.setup();
    }
}

aquarium.Renderer = function(root) {
    // FIXME Ugly
    var requestAnimationFrame = window.requestAnimationFrame       || 
        window.webkitRequestAnimationFrame || 
        window.mozRequestAnimationFrame    || 
        window.oRequestAnimationFrame      || 
        window.msRequestAnimationFrame     || 
        function( callback ){
            window.setTimeout(callback, 1000 / 60);
        };
    this.world = undefined;

    this.steppers = [];

    this.add_frame_callback = function(func) {
        this.steppers.push([0, func]);
    }

    this.current_frame = 0;

    this.last_time = Date.now();

    this.frame = function() {
        // Steps through the world.
        var time = Date.now();
        requestAnimationFrame(this.frame.bind(this));
        if(time - this.last_time < 20) return;

        while(time - this.last_time >= 20) {
            this.last_time += 20;
        }

        for(var i = 0, stepper; stepper = this.steppers[i]; i++) {
            if(this.current_frame >= stepper[0]) {
                stepper[0] += stepper[1]();
            }
        }
        this.current_frame++;
    }

    this.addEventListener = function(name, callback) {
        this.canvas.addEventListener(name, callback, false);
    }
    this.removeEventListener = function(name, callback) {
        this.canvas.removeEventListener(name, callback, false);
    }

    this.initialize = function(world, data) {
        this.world = world;
        this.world.initialize(this);
        this.add_frame_callback(this.world.step.bind(this.world));
        this.add_frame_callback(this.world.check_bubbles.bind(this.world));

        this.resource.load(data);
        this.resource.callback = this.world.setup.bind(this.world);
    }

    this.setup = function() {
        this.frame();
    }

    this.resource = new Resource(root);
}

aquarium.CanvasRenderer = function(canvas_id, root) {
    aquarium.Renderer.call(this, root);
    this.canvas = document.getElementById(canvas_id);
    this.context = this.canvas.getContext('2d');

    this.render = function() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.world.render();
        
        // Draw food.
        for(var i = 0, e; e = this.world.entities[i]; i++) {
            var img = this.resource.entries.textures[e.resource_id];
            if(e.type != aquarium.FoodType) continue;
            var scale = e.size / Math.max(img.width, img.height);
            this.context.drawImage(img, 0, 0, img.width, img.height,
                    this.world.width * 0.5 + e.pos.x - img.width * scale * 0.5,
                    this.world.height * 0.5 + e.pos.y - img.height * scale * 0.5,
                    img.width * scale, img.height * scale);
        }

        // Draw boids.
        for(var i = 0, e; e = this.world.entities[i]; i++) {
            var img = this.resource.entries.textures[e.resource_id];
            if(e.type != aquarium.BoidType) continue;
            var scale = e.size / Math.max(img.width, img.height);
            this.context.save();
            this.context.translate(
                    this.world.width * 0.5 + e.pos.x,
                    this.world.height * 0.5 + e.pos.y);
            if(e.direction.x < 0) {
                this.context.scale(scale, scale);
                var angle = aquarium.angle_between(-1, 0,
                        e.direction.x, e.direction.y);
            } else {
                this.context.scale(-scale, scale);
                var angle = aquarium.angle_between(1, 0,
                        e.direction.x, e.direction.y);
            }
            if(e.direction.y > 0) angle = -angle;
            this.context.rotate(angle);

            this.context.drawImage(img, -img.width * 0.5, -img.height * 0.5);
            this.context.restore();
        }

        // Draw features.
        for(var i = 0, e; e = this.world.entities[i]; i++) {
            var img = this.resource.entries.textures[e.resource_id];
            if(e.type != aquarium.FeatureType) continue;

            var scale = e.size / Math.max(img.width, img.height);
            this.context.drawImage(img, 0, 0, img.width, img.height,
                    this.world.width * 0.5 + e.pos.x - img.width * 0.5 * scale,
                    this.world.height * 0.5 + e.pos.y - img.height * scale,
                    img.width * scale, img.height * scale);
        }

        // Draw bubbles.
        for(var i = 0, e; e = this.world.entities[i]; i++) {
            var img = this.resource.entries.textures[e.resource_id];
            if(e.type != aquarium.BubbleType) continue;
            var scale = e.size / Math.max(img.width, img.height);
            this.context.drawImage(img, 0, 0, img.width, img.height,
                    this.world.width * 0.5 + e.pos.x - img.width * 0.5 * scale,
                    this.world.height * 0.5 + e.pos.y - img.height * 0.5 * scale,
                    img.width * scale, img.height * scale);
        }

        // Draw interface.
        for(var i = 0, e; e = this.world.entities[i]; i++) {
            var img = this.resource.entries.textures[e.resource_id];
            if(e.type != aquarium.ButtonType) continue;
            var scale = e.size * this.world.width /
                    Math.max(img.width, img.height);
            this.context.drawImage(img, 0, 0, img.width, img.height,
                    this.world.width * e.pos.x,
                    this.world.height * e.pos.y,
                    img.width * scale, img.height * scale);
        }

        // Draw scores.
        this.context.font = 'bold ' + Math.floor(this.world.width * 0.04) +
                'px sans-serif';
        this.context.fillStyle = '#fff';
        this.context.fillText(this.world.hiscore.toFixed(0), this.world.width * 0.05,
                this.world.height * 0.1);
        this.context.font = Math.floor(this.world.width * 0.03) +
                'px sans-serif';
        this.context.fillText(this.world.score.toFixed(0), this.world.width * 0.05,
                this.world.height * 0.17);

        return 2;
    }

    this.add_frame_callback(this.render.bind(this));
}

Resource = function(root) {
    this.entries = {};
    this.to_load = [];
    this.callback = null;

    this.img_loaded = function(img, name) {
        this.entries.textures[name] = img;
        this.count--;

        if(this.count == 0) {
            // Remove buffers.
            if(this.callback != null)
                this.callback();
        }
    }

    this.load = function(data) {
        this.entries = data;
        this.count = 0;
        console.log(data);
        for(var name in data.textures) {
            console.log(name);
            var entry = data.textures[name];
            var img = new Image();
            // FIXME UUUUGGGLLLYYY
            var that = this;
            img.onload = (function(name, thatimg) { 
                return function(evt) {
                    that.img_loaded(thatimg, name);
                };
            })(name, img);
            img.src = root + name + '.png';
            this.count++;
        }
    }
}

aquarium.run_canvas = function(canvas_id, root) {
    var renderer = new aquarium.CanvasRenderer(canvas_id, root);
    var world = new aquarium.World(renderer);
    renderer.initialize(world, data);
}

aquarium.run_webgl = function(canvas_id, root) {
    var renderer = new aquarium.WebGLRenderer(canvas_id, root);
    var world = new aquarium.World(renderer);
    renderer.initialize(world, data);
}



// MAIN 
var projection = mat4.perspective(75, 4/3, 0.1, 10); 
var isRunning = true; 

function main() {
    gl = UTIL.createContext(640, 480); 

   	var camPos = vec3.create([0,1,2]);
	var camNormal = vec3.create([0,0,-1]); 
	var camDir = vec3.create([0,0,0]); 
	var camUp = vec3.create([0,1,0]); 

    //var teapot = SHAPES.createTeapot(gl, projection); 
    var backplane = SHAPES.createLayer(gl, projection); 
    //var plane = SHAPES.createPlane(gl, projection); 

	UTIL.requestGameFrame(gameloop); 

    function gameloop(info) {
        if(isRunning) { 			
			var camera = calcCamera(info.time.delta, camPos, camNormal, camDir, camUp); 

			clear(gl); 
            backplane.draw(camera);
			//teapot.draw(camera); 
			//plane.draw(camera); 
            backplane.update(info.time.delta); 
			//teapot.update(info.time.delta); 
			//plane.update(info.time.delta); 
        }
		
		if(UTIL.keys.p.released) {
			isRunning = !isRunning; 
		}

        UTIL.requestGameFrame(gameloop); 
    }
}

function calcCamera(delta, camPos, camNormal, camDir, camUp) {
	var d = delta; 

	if(UTIL.keys.shift.down) {
		d *= 3; 
	}

	var camera = mat4.lookAt(camPos, vec3.add(camPos, camNormal, camDir), camUp);
	var pad = UTIL.gamepads.first;  

	var padX1 = pad.axes[0]; 
	var padY1 = pad.axes[1];
	var padX2 = pad.axes[2];
	var padY2 = pad.axes[3];

	var forward = padY1 * d; 
	var spin = padX2 * d * 2 * Math.PI; 

	forward += UTIL.keys.w.down ? d : 0; 
	forward -= UTIL.keys.s.down ? d : 0; 
	spin += UTIL.keys.a.down ? 2 * Math.PI * d : 0; 
	spin -= UTIL.keys.d.down ? 2 * Math.PI * d : 0; 

	vec3.add(camPos, [forward * camNormal[0], 0, forward * camNormal[2]]); 

	var matRot = mat4.identity(); 
	mat4.rotateY(matRot, spin); 
	mat4.rotateX(matRot, padY2); 
	mat4.multiplyVec3(matRot, camNormal); 

	return camera; 
}

function clear(gl) {
    gl.viewport(0, 0, 640, 480); 
    gl.clearColor(97 / 256, 149 / 256, 237 / 256, 1); 
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); 
	gl.enable(gl.DEPTH_TEST); 
}

