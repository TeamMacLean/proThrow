import Request from './request';
import SampleDescription from './sampleDescription';
import SampleImage from './sampleImage';

Request.hasMany(SampleDescription, 'samplesDescriptions', 'id', 'requestID');
Request.hasMany(SampleImage, 'samplesImages', 'id', 'requestID');

SampleDescription.belongsTo(Request, 'request', 'requestID', 'id');

export default {
    Request,
    SampleDescription,
    SampleImage
}
