import Thinky from 'thinky';
import {dbName} from '../../config';

const thinky = new Thinky({
    db: dbName
});

export default thinky;
