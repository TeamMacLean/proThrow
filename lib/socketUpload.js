const dl = require('delivery');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const sharp = require('sharp');

const imageMimes = config.supportedFileTypes;

module.exports = io => {
    io.sockets.on('connection', socket => {
        const delivery = dl.listen(socket);
        delivery.on('receive.success', file => {
            // var params = file.params;
            const newPath = path.join(config.supportingImageRoot, file.name);
            const tmpPath = path.join('./public/preview', file.name);
            fs.writeFile(newPath, file.buffer, err => {
                if (err) {
                    console.log('File could not be saved.');
                    socket.emit('upload.error');
                } else {
                    console.log(path.extname(file.name));
                    if (imageMimes.indexOf(path.extname(file.name)) > -1) {
                        sharp(newPath)
                            .resize(300)
                            .toFile(tmpPath, err => {
                                if (err) {
                                    socket.emit('upload.error', {
                                        name: file.name,
                                        preview: `/preview/${file.name}`,
                                        id: 'TODO'
                                    });
                                } else {
                                    socket.emit('upload.complete', {
                                        name: file.name,
                                        preview: `/preview/${file.name}`,
                                        id: 'TODO'
                                    });
                                }


                            });
                    } else {
                        socket.emit(
                            'upload.complete',
                            {name: file.name, preview: `/preview/${file.name}`, id: 'TODO'}
                        );
                    }

                }
            });
         });
    });
};