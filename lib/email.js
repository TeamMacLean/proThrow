const nodemailer = require('nodemailer');
const EmailTemplate = require('email-templates').EmailTemplate;
const path = require('path');
const templatesDir = path.resolve(__dirname, '..', 'views', 'email');
const config = require('../config');
const smtpTransport = require('nodemailer-smtp-transport');

var Email = {};

Email.newJob = function (request) {

    const transporter = nodemailer.createTransport(smtpTransport({
        host: config.email.host,
        port: config.email.port
    }));

    const addresses = [];

    config.admins.map(username => {
        addresses.push(username + config.email.emailDomain);
    });

    const newOrder = transporter.templateSender(new EmailTemplate(path.join(templatesDir, 'new-order')), {
        from: config.email.from
    });

    newOrder({
        to: addresses,
        subject: 'TSL Proteomics - New Order',
        priority: 'high'
    }, {
        request,
        baseURL: config.baseURL
    }, (err, info) => {
        if (err) {
            console.log('failed to send email', err);
        } else {
            console.log('Message sent:', info.response);
        }
    });
};

module.exports = Email;