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


module.exports = gulp;