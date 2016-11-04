var Request = require('../models/request');
var Email = require('../lib/email');

var SocketRequest = function (socket) {

    socket.on('assignTo', function (obj) {

        Request.get(obj.id)
            .then(function (request) {
                request.assignedTo = obj.admin;
                request.save()
                    .then(function () {
                    })
                    .catch((err)=> {
                        console.error(err);
                    })
            })
            .catch(function (err) {
                console.error(err);
            });


    });

    socket.on('toggleCompletion', function (obj) {
        Request.get(obj.id)
            .then(function (request) {
                request.complete = obj.complete == 'true';
                request.save()
                    .then(function () {

                        if (request.complete == true) {
                            Email.updatedJob(request);
                        }

                    })
                    .catch((err)=> {
                        console.error(err);
                    })
            })
            .catch(function (err) {
                console.error(err);
            });
    });

};


module.exports = SocketRequest;