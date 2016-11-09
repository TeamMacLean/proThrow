var Request = require('../models/request');
var Email = require('../lib/email');

var SocketRequest = (socket) => {

    socket.on('assignTo', (obj) => {

        Request.get(obj.id)
            .then((request) => {
                request.assignedTo = obj.admin;
                request.save()
                    .then(() => {
                        Email.updatedRequest(request);
                    })
                    .catch((err)=> {
                        console.error(err);
                    })
            })
            .catch((err) => {
                console.error(err);
            });


    });

    socket.on('toggleCompletion', (obj) => {
        Request.get(obj.id)
            .then((request)=> {
                request.complete = obj.complete == 'true';
                request.save()
                    .then(() => {
                        Email.updatedRequest(request);
                    })
                    .catch((err)=> {
                        console.error(err);
                    })
            })
            .catch((err) => {
                console.error(err);
            });
    });

};


module.exports = SocketRequest;