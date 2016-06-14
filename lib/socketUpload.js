const dl = require('delivery');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const sharp = require('sharp');

const imageMimes = ['.png', '.PNG', '.jpg', '.JPG', '.jpeg', '.JPEG', '.gif', '.GIF'];

module.exports = function (io) {
    io.sockets.on('connection', function (socket) {
        var delivery = dl.listen(socket);
        delivery.on('receive.success', function (file) {
            // var params = file.params;
            var newPath = path.join(config.supportingImageRoot, file.name);
            var tmpPath = path.join('./public/preview', file.name);
            fs.writeFile(newPath, file.buffer, function (err) {
                if (err) {
                    console.log('File could not be saved.');
                    socket.emit('upload.error');
                } else {
                    console.log(path.extname(file.name));
                    if (imageMimes.indexOf(path.extname(file.name)) > -1) {
                        sharp(newPath)
                            .resize(300)
                            .toFile(tmpPath, function (err) {
                                // output.jpg is a 300 pixels wide and 200 pixels high image
                                // containing a scaled and cropped version of input.jpg


                                if (err) {
                                    socket.emit('upload.error', {
                                        name: file.name,
                                        preview: '/preview/' + file.name,
                                        id: 'TODO'
                                    });
                                } else {
                                    socket.emit('upload.complete', {
                                        name: file.name,
                                        preview: '/preview/' + file.name,
                                        id: 'TODO'
                                    });
                                }


                            });
                    } else {
                        socket.emit('upload.complete', {name: file.name, preview: '/preview/' + file.name, id: 'TODO'});
                    }

                }
            });


            //TODO move file to storage

            //TODO create new File record
            //TODO send record ID to client


            //TODO resize and return image

            // console.log(file);


        });
    });
};