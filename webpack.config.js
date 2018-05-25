const path = require('path');
const webpack = require('webpack');
const config = require('./config.js');

module.exports = {
    entry: {
        app: [
            path.resolve(path.join(__dirname, "public", "js", 'app.jsx'))
        ],
    },
    watch: true,
    mode: 'development',
    module: {
        rules: [
            {
                test: /.jsx?$/,
                loader: 'babel-loader',
                exclude: /node_modules/,
                query: {
                    presets: ['es2015', 'react']
                }
            },
            {
                test: /\.css$/,
                use: ['style-loader', 'css-loader']
            }
        ]
    },
    plugins: [
        new webpack.DefinePlugin({
            'process.env': {
                supportedFileTypes: config.supportedFileTypes.join(',')
            }
        })
    ],
    output: {
        path: path.join(__dirname, "public", "js"),
        filename: '[name].js'
    },
};