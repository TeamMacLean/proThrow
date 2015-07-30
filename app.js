var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');

var indexRoute = require('./routes/index');
var adminRoute = require('./routes/index');

var app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRoute);
app.use('/admin', adminRoute);

module.exports = app;
