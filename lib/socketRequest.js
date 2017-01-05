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

    socket.on('toggleStatus', (obj) => {
        Request.get(obj.id)
            .then((request)=> {
                request.status = obj.status;
                // request.complete = obj.complete == 'true';

                request.save()
                    .then(() => {

                        console.log(request.status, Request.statuses.COMPLETE, request.status = Request.statuses.COMPLETE)

                        if (request.status == Request.statuses.COMPLETE) {
                            Email.requestComplete(request)
                        } else {
                            Email.updatedRequest(request);
                        }

                    })
                    .catch((err)=> {
                        console.error(err);
                    })
            })
            .catch((err) => {
                console.error(err);
            });
    });

    socket.on('addNote', (obj)=> {
        Request.get(obj.id)
            .then((request)=> {
                request.notes.push(obj.note);
                // request.complete = obj.complete == 'true';
                request.save()
                    .then(() => {

                        socket.emit('noteAdded', {note: obj.note});

                        Email.updatedRequest(request); //TODO want emails updates of notes?


                    })
                    .catch((err)=> {
                        console.error(err);
                    })
            })
            .catch((err) => {
                console.error(err);
            });
    })
};


module.exports = SocketRequest;