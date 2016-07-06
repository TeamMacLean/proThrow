'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = error;
function error(err, res) {
    console.error(err);
    if (res) {
        return res.render('error', { error: err });
    }
};