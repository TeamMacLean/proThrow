const Thinky = require('thinky');
const dbName = require('../config').dbName;

const thinky = new Thinky({
    db: dbName
});

module.exports = thinky;
