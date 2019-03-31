const del = require('del');
const gulp = require('gulp');
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');
const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
const server = require('browser-sync').create();
const mqpacker = require('css-mqpacker');
const minify = require('gulp-csso');
const rename = require('gulp-rename');
const imagemin = require('gulp-imagemin');
const svgstore = require('gulp-svgstore');
const handlebars = require('gulp-compile-handlebars');
const fs = require('fs');
const yaml = require('js-yaml');
const rollup = require('gulp-better-rollup');
const sourcemaps = require('gulp-sourcemaps');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const babel = require('rollup-plugin-babel');
const uglify = require('gulp-uglify');

gulp.task('style', () => {
  return gulp.src('scss/style.scss').
    pipe(plumber()).
    pipe(sass()).
    pipe(postcss([
      autoprefixer(),
      mqpacker({sort: true})
    ])).
    pipe(gulp.dest('build/css')).
    pipe(server.stream()).
    pipe(minify()).
    pipe(rename('style.min.css')).
    pipe(gulp.dest('build/css'));
});

gulp.task('sprite', () => {
  return gulp.src('img/sprite/*.svg')
    .pipe(svgstore({
      inlineSvg: true
    }))
    .pipe(rename('sprite.svg'))
    .pipe(gulp.dest('build/img'));
});

gulp.task('scripts', () => {
  return gulp.src('js/main.js')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(rollup({
      plugins: [
        resolve({browser: true}),
        commonjs(),
        babel({
          babelrc: false,
          exclude: 'node_modules/**',
          presets: ['@babel/env']
        })
      ]
    }, 'iife'))
    .pipe(uglify())
    .pipe(sourcemaps.write(''))
    .pipe(gulp.dest('build/js'));
});

gulp.task('imagemin', ['copy'], () => {
  return gulp.src('build/img/**/*.{jpg,png,gif}').
    pipe(imagemin([
      imagemin.optipng({optimizationLevel: 3}),
      imagemin.jpegtran({progressive: true})
    ])).
    pipe(gulp.dest('build/img'));
});

gulp.task('templates', () => {
  const templateData = yaml.safeLoad(fs.readFileSync('data.yml', 'utf-8'));
  const options = {
    ignorePartials: true,
    batch: ['./templates/patrials']
  };
  return gulp
    .src('templates/*.hbs')
    .pipe(handlebars(templateData, options))
    .pipe(
      rename((path) => {
        path.extname = '.html';
      })
    )
    .pipe(gulp.dest('build'))
    .pipe(server.stream());
});

gulp.task('copy', ['templates', 'scripts', 'style', 'sprite'], () => {
  return gulp.src([
    'fonts/**/*.{woff,woff2}',
    'img/*.*'
  ], {base: '.'}).
    pipe(gulp.dest('build'));
});

gulp.task('clean', () => {
  return del('build');
});

gulp.task('js-watch', ['scripts'], (done) => {
  server.reload();
  done();
});

gulp.task('serve', ['assemble'], () => {
  server.init({
    server: './build',
    notify: false,
    open: true,
    port: 3000,
    ui: false
  });

  gulp.watch('scss/**/*.{scss,sass}', ['style']);
  gulp.watch('templates/**/*.hbs').on('change', (e) => {
    if (e.type !== 'deleted') {
      gulp.start('templates');
    }
  });
  gulp.watch('templates/**/*.hbs', ['templates']);
  gulp.watch('data.yml', ['templates']);
  gulp.watch('js/**/*.js', ['js-watch']);
});

gulp.task('assemble', ['clean'], () => {
  gulp.start('copy', 'style');
});

gulp.task('build', ['assemble'], () => {
  gulp.start('imagemin');
});
