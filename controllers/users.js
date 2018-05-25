const Request = require('../models/request');
const renderError = require('../lib/renderError');

const Users = {};

Users.show = (req, res)=> {

    const username = req.params.username;
    // console.log('username', username);

    Request.filter({createdBy: username}).then((requests) => {

        if (!requests.length) {
            return renderError('No requests found for user ' + username, res);
        } else {
            return res.render('user/show', {requests});
        }


    }).error((err) => {
        return renderError(err, res);
    })


};


module.exports = Users;
