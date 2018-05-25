/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ({

/***/ "./public/js/main.src.js":
/*!*******************************!*\
  !*** ./public/js/main.src.js ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
eval("\n\n$(function () {\n\n    var resultsDiv = $('#nav-search-results');\n\n    var socket = io(window.location.host);\n    socket.on('connect', function () {\n\n        socket.on('search result', function (results) {\n            console.log('result received', results);\n\n            resultsDiv.empty();\n            resultsDiv.append($('<ul>'));\n\n            results.map(function (r) {\n                resultsDiv.append($('<li>').text(r));\n            });\n        });\n        socket.on('search error', function (error) {\n            console.log('error received', error);\n        });\n    });\n\n    $('#nav-search-button').on('click', function () {\n        $('#nav-search-bar').toggle();\n    });\n\n    $('#nav-search-input').on('input', function () {\n        console.log('sending search');\n        socket.emit('search', $(this).val());\n    });\n\n    $('#assign-select').bind('change', function (e) {\n        // e.preventDefault();\n\n        var id = $('#id');\n\n        if (id) {\n            socket.emit('assignTo', { id: id.val(), admin: $(this).val() });\n        } else {\n            alert('could not find ID of job, please inform Proteomics of the issue');\n        }\n    });\n\n    $('#completion-selection').bind('change', function (e) {\n\n        var id = $('#id');\n        if (id) {\n            console.log('emitting', $(this).val());\n            socket.emit('toggleStatus', { id: id.val(), status: $(this).val() });\n        } else {\n            alert('could not find ID of job, please inform Proteomics of the issue');\n        }\n    });\n\n    $('.areyousure').click(function () {\n        return window.confirm('Are you sure?');\n    });\n\n    $('#notes-button').on('click', function () {\n\n        var id = $('#id');\n\n        if (id) {\n            socket.emit('addNote', { id: id.val(), note: $('#new-note').val() });\n        } else {\n            alert('could not find ID of job, please inform Proteomics of the issue');\n        }\n    });\n\n    socket.on('noteAdded', function (obj) {\n        $('#notes').append('<li>' + obj.note + '</li>');\n        $('#new-note').val('');\n    });\n});\n\n//# sourceURL=webpack:///./public/js/main.src.js?");

/***/ }),

/***/ 0:
/*!*************************************!*\
  !*** multi ./public/js/main.src.js ***!
  \*************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

eval("module.exports = __webpack_require__(/*! /Users/pagem/Documents/workspace/proThrow/public/js/main.src.js */\"./public/js/main.src.js\");\n\n\n//# sourceURL=webpack:///multi_./public/js/main.src.js?");

/***/ })

/******/ });