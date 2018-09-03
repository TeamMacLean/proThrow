const nodemailer = require('nodemailer');
const EmailTemplate = require('email-templates').EmailTemplate;
const path = require('path');
const templatesDir = path.resolve(__dirname, '..', 'views', 'email');
const config = require('../config');
const smtpTransport = require('nodemailer-smtp-transport');

var Email = {};

Email.newRequest = (request) => {

    const transporter = nodemailer.createTransport(smtpTransport({
        host: config.email.host,
        port: config.email.port
    }));

    const addresses = [];

    config.admins.map(username => {
        addresses.push(username + config.email.emailDomain);
    });

    const newOrder = transporter.templateSender(new EmailTemplate(path.join(templatesDir, 'new-request')), {
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


Email.updatedRequest = (request) => {

    const transporter = nodemailer.createTransport(smtpTransport({
        host: config.email.host,
        port: config.email.port
    }));

    const addresses = [];

    config.admins.map(username => {
        addresses.push(username + config.email.emailDomain);
    });

    const updatedOrder = transporter.templateSender(new EmailTemplate(path.join(templatesDir, 'updated-request')), {
        from: config.email.from
    });

    if (request.createdBy && config.email.emailDomain) {
        addresses.push(request.createdBy + config.email.emailDomain);
    }

    updatedOrder({
        to: addresses,
        subject: 'TSL Proteomics - Updated Order',
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

Email.requestComplete = (request) => {

    const transporter = nodemailer.createTransport(smtpTransport({
        host: config.email.host,
        port: config.email.port
    }));

    // const addresses = [];

    // config.admins.map(username => {
    //     addresses.push(username + config.email.emailDomain);
    // });

    const requestComplete = transporter.templateSender(new EmailTemplate(path.join(templatesDir, 'request-complete')), {
        from: config.email.from
    });

    requestComplete({
        to: [request.createdBy + config.email.emailDomain],
        subject: 'TSL Proteomics - Request Complete',
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