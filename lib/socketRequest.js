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


                if (request.status != obj.status) {
                    console.log(request.status, 'is now', obj.status);

                    request.status = obj.status;
                    // request.complete = obj.complete == 'true';

                    request.save()
                        .then((savedRequest) => {

                            console.log(savedRequest.status, Request.statuses.COMPLETE, '==?', savedRequest.status == Request.statuses.COMPLETE)

                            if (savedRequest.status == Request.statuses.COMPLETE) {
                                Email.requestComplete(request)
                            } else {
                                Email.updatedRequest(request);
                            }

                        })
                        .catch((err)=> {
                            console.error(err);
                        })
                } //else, nothing to do


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