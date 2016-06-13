var gulp = require("gulp");
var babel = require("gulp-babel");

gulp.task("babel", function () {
    return gulp.src("public/js/app.jsx")
        .pipe(babel({
            presets: ['react']
        }))
        .pipe(gulp.dest("public/js/"));
});

gulp.task('default', ["babel"]);


gulp.task('watch', function () {
    var watcher = gulp.watch('public/js/app.jsx', ['babel']);
    watcher.on('change', function (event) {
        console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
    });
});


module.exports = gulp;