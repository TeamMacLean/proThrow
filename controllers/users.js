const Request = require('../models/request');
const UUID = require('../lib/uuid');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const renderError = require('../lib/renderError');
const Util = require('../lib/util');
// const moment = require('moment';
const SampleDescription = require('../models/sampleDescription');
const SampleImage = require('../models/sampleImage');

const Users = {};

Users.show = function (req, res) {

    const username = req.params.username;
    console.log('username', username);

    Request.filter({createdBy: username}).then(function (requests) {

        if (!requests.length) {
            return renderError('No requests found for user ' + username, res);
        } else {
            return res.render('user/show', {requests});
        }


    }).error(function (err) {
        return renderError(err, res);
    })


};


module.exports = Users;
