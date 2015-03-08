var fs = require('fs');
var browserify = require('browserify');
var gulp = require('gulp');
var source = require('vinyl-source-stream');
var concat = require('gulp-concat');
var csso = require('gulp-csso');
var uglify = require('gulp-uglify');
var imagemin = require('gulp-imagemin');
var less = require('gulp-less');
var path = require('path');
var del = require('del');
var rename = require('gulp-rename');
var runSequence = require('run-sequence');

var browserify = require("browserify");
var to5ify = require("6to5ify");

var paths = {
  vendor_js: [

  ],
  images: [
    'app/client/img/**/*'
  ],
  less: [
    'app/client/less/main.less'
  ],
  js: [
    'app/client/js/app.js'
  ]
};

// Not all tasks need to use streams
// A gulpfile is just another node program and you can use all packages available on npm
gulp.task('clean', function(cb) {
  // You can use multiple globbing patterns as you would with `gulp.src`
  del([
    'app/public/js/**/*',
    'app/public/css/**/*'
  ], cb);
});

// a prep step for browserifying commonjs modules
gulp.task('vendor_js', function() {
  return gulp.src(paths.vendor_js)
    .pipe(uglify())
    .pipe(concat('vendor.min.js'))
    .pipe(gulp.dest('app/public/js'));
});

gulp.task('less', function () {
  return gulp.src(paths.less)
    .pipe(less({
      paths: [ path.join(__dirname, 'less', 'includes') ]
    }))
    // .pipe(csso())
    .pipe(gulp.dest('app/public/css'));
});

gulp.task('js', function () {
  return browserify({ debug: true })
    .transform(to5ify)
    .require('./app/client/js/app.js', { entry: true })
    .bundle()
    .on("error", function (err) { console.log("Error : " + err.message); })
    .pipe(fs.createWriteStream('app/public/js/bundle.js'));
});

// Copy all static images
gulp.task('images', function() {
  return gulp.src(paths.images)
    .pipe(gulp.dest('app/public/img'));
});

gulp.task('watch', function() {
  gulp.watch(paths.less, ['less']);
  gulp.watch(paths.js, ['js']);
});

// NOTE: vendor icons supported but font awesome used instead
gulp.task('default', function(callback) {
  runSequence('clean', ['less', 'vendor_js', 'js', 'watch'], callback);
});
