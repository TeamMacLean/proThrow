const gulp = require('gulp');
const babel = require('gulp-babel');
const rename = require('gulp-rename');
const config = require('./config.json');
const uglify = require('gulp-uglify');

const jsPath = 'public/js';
const appPath = `${jsPath}/app.jsx`;

gulp.task('default', () => gulp.src(appPath)
    .pipe(babel({
        presets: ['react', 'es2015'],
        plugins: [
            ['defines', {supportedFileTypes: config.supportedFileTypes.join(',')}]
        ]
    }))
    .pipe(gulp.dest(jsPath))
    .pipe(uglify())
    .pipe(rename({
        suffix: '.min'
    }))
    .pipe(gulp.dest(jsPath)));


gulp.task('watch', () => gulp.watch(appPath, ['default'])
    .on('change', event => {
        console.log(`File ${event.path} was ${event.type}, running tasks...`);
    }));


module.exports = gulp;