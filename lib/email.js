const nodemailer = require('nodemailer');
const EmailTemplate = require('email-templates').EmailTemplate;
const path = require('path');
const templatesDir = path.resolve(__dirname, '..', 'views', 'email');


const nodeMailer = require('nodemailer');
const config = require('../config');
const smtpTransport = require('nodemailer-smtp-transport');

var Email = {};

const transporter = nodeMailer.createTransport(smtpTransport({
    host: config.mailServer,
    port: 25
}));

Email.sendEmail = function (text) {
    transporter.sendMail({
        from: 'prothrow@tsl.ac.uk',
        to: 'martin.page@tsl.ac.uk',
        subject: 'New request (prothrow)',
        text: `${text}\n\n`
    }, (error, info) => {
        if (error) {
            return renderError(err, res);
        } else {
            console.log('Message sent:', info.response);
        }
    });
};

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
    console.log(order);
    newOrder({
        to: addresses,
        subject: 'SynBio - New Order',
        priority: 'high'
    }, {
        order,
        user,
        baseURL: config.baseURL
    }, (err, info) => {
        if (err) {
            return bad(err);
        } else {
            console.log('Message sent:', info.response);
            return good();
        }
    });

};

module.exports = Email;