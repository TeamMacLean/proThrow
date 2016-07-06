import dl from 'delivery';
import fs from 'fs';
import path from 'path';
import config from '../../config.js';
import sharp from 'sharp';
import sampleImage from '../models/sampleImage';
const imageMimes = config.supportedFileTypes;

export default io => {
    io.sockets.on('connection', socket => {
        const delivery = dl.listen(socket);
        delivery.on('receive.success', file => {
            // var params = file.params;

            const newPath = path.join(config.supportingImageRoot, file.uid);
            const tmpPath = path.join(config.supportingImagePreviewRoot, file.uid);

            console.log(newPath, tmpPath);

            fs.writeFile(newPath, file.buffer, err => {
                if (err) {
                    console.error('File could not be saved.');
                    socket.emit('upload.error');
                } else {

                    const si = new sampleImage({path: newPath, name: file.name, uid: file.uid});

                    si.save().then(savedSI => {
                        if (imageMimes.indexOf(path.extname(file.name)) > -1) {
                            sharp(newPath)
                                .resize(300)
                                .toFile(tmpPath, err => {
                                    if (err) {
                                        console.error(err);
                                        socket.emit('upload.error', {
                                            name: file.name,
                                            preview: `${config.supportingImagePreviewRootURL}/${file.uid}`,
                                            id: 'TODO'
                                        });
                                    } else {
                                        socket.emit('upload.complete', {
                                            name: file.name,
                                            preview: `${config.supportingImagePreviewRootURL}${file.uid}`,
                                            uid: savedSI.uid
                                        });
                                    }


                                });
                        } else {
                            socket.emit('upload.complete', {
                                name: file.name,
                                preview: `${config.supportingImagePreviewRootURL}${file.uid}`,
                                uid: file.uid
                            });
                        }
                    }).error(err => {
                        console.error(err);
                        socket.emit('upload.error', {
                            name: file.name,
                            preview: `${config.supportingImagePreviewRootURL}${file.uid}`
                        });
                    });
                }
            });
        });
    });
};
