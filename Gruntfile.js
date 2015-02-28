'use strict';

module.exports = function(grunt) {
  grunt.initConfig({
    watch: {
      options: {
        spawn: false,
        interrupt: true
      },

      gruntfile: {
        files: ['Gruntfile.js']
      },

      express: {
        files: [
          'server.js',
          'server/**/*.{js,json}'
        ],
        tasks: ['express:dev', 'wait'],
        options: {
          livereload: true,
          nospawn: true //Without this option specified express won't be reloaded
        }
      }
    },

    // Server stuff
    express: {
      options: {
        port: process.env.PORT || 9000
      },
      dev: {
        options: {
          script: 'server.js',
          debug: true
        }
      },
      prod: {
        options: {
          script: 'server.js',
          node_env: 'production'
        }
      }
    }
  });

  require('load-grunt-tasks')(grunt);

  // Used for delaying livereload until after server has restarted
  grunt.registerTask('wait', function() {
    grunt.log.ok('Waiting for server reload...');

    var done = this.async();

    setTimeout(function() {
      grunt.log.writeln('Done waiting!');
      done();
    }, 500);
  });

  grunt.registerTask('serve', ['express:dev', 'express-keepalive']);
  grunt.registerTask('heroku', ['serve']);

  grunt.registerTask('default', ['serve']);

  grunt.registerTask('express-keepalive', 'Keep grunt running', function() {
    this.async();
  });
};
