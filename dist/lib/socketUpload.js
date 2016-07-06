'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _delivery = require('delivery');

var _delivery2 = _interopRequireDefault(_delivery);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _config = require('../../config.js');

var _config2 = _interopRequireDefault(_config);

var _sharp = require('sharp');

var _sharp2 = _interopRequireDefault(_sharp);

var _sampleImage = require('../models/sampleImage');

var _sampleImage2 = _interopRequireDefault(_sampleImage);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var imageMimes = _config2.default.supportedFileTypes;

exports.default = function (io) {
    io.sockets.on('connection', function (socket) {
        var delivery = _delivery2.default.listen(socket);
        delivery.on('receive.success', function (file) {
            // var params = file.params;

            var newPath = _path2.default.join(_config2.default.supportingImageRoot, file.uid);
            var tmpPath = _path2.default.join(_config2.default.supportingImagePreviewRoot, file.uid);

            console.log(newPath, tmpPath);

            _fs2.default.writeFile(newPath, file.buffer, function (err) {
                if (err) {
                    console.error('File could not be saved.');
                    socket.emit('upload.error');
                } else {

                    var si = new _sampleImage2.default({ path: newPath, name: file.name, uid: file.uid });

                    si.save().then(function (savedSI) {
                        if (imageMimes.indexOf(_path2.default.extname(file.name)) > -1) {
                            (0, _sharp2.default)(newPath).resize(300).toFile(tmpPath, function (err) {
                                if (err) {
                                    console.error(err);
                                    socket.emit('upload.error', {
                                        name: file.name,
                                        preview: _config2.default.supportingImagePreviewRootURL + '/' + file.uid,
                                        id: 'TODO'
                                    });
                                } else {
                                    socket.emit('upload.complete', {
                                        name: file.name,
                                        preview: '' + _config2.default.supportingImagePreviewRootURL + file.uid,
                                        uid: savedSI.uid
                                    });
                                }
                            });
                        } else {
                            socket.emit('upload.complete', {
                                name: file.name,
                                preview: '' + _config2.default.supportingImagePreviewRootURL + file.uid,
                                uid: file.uid
                            });
                        }
                    }).error(function (err) {
                        console.error(err);
                        socket.emit('upload.error', {
                            name: file.name,
                            preview: '' + _config2.default.supportingImagePreviewRootURL + file.uid
                        });
                    });
                }
            });
        });
    });
};