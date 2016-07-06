import thinky from '../lib/thinky.js';
const type = thinky.type;
import config from '../../config.js';
const SampleImage = thinky.createModel('SampleImage', {
    id: type.string(),
    uid: type.string().required(),
    requestID: type.string(),
    name: type.string().required(),
    path: type.string().required(),
    description: type.string()
});


SampleImage.define('getURL', function() {
    return config.supportingImageRootURL + this.uid;
});
export default SampleImage;
