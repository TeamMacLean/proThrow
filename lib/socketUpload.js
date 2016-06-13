const dl = require('delivery');
const fs = require('fs');

module.exports = function (io) {
    io.sockets.on('connection', function (socket) {
        var delivery = dl.listen(socket);
        delivery.on('receive.success', function (file) {
            var params = file.params;
            //     fs.writeFile(file.name, file.buffer, function (err) {
            //         if (err) {
            //             console.log('File could not be saved.');
            //         } else {
            //             console.log('File saved.');
            //         }
            //     });


            //TODO move file to storage
            //TODO create new File record
            //TODO send record ID to client
            socket.emit('upload.complete', {name: file.name, id: 'TODO'});
        });
    });
};