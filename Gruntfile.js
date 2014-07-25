/*global module:false*/

module.exports = function(grunt) {

  var srcFiles = [
    'src/ExSIP.js',
    'src/Logger.js',
    'src/EventEmitter.js',
    'src/Constants.js',
    'src/Exceptions.js',
    'src/Timers.js',
    'src/Transport.js',
    'src/Parser.js',
    'src/SIPMessage.js',
    'src/Subscriber.js',
    'src/URI.js',
    'src/NameAddrHeader.js',
    'src/Transactions.js',
    'src/Dialogs.js',
    'src/RequestSender.js',
    'src/InDialogRequestSender.js',
    'src/Registrator.js',
    'src/RTCSession.js',
    'src/Message.js',
    'src/UA.js',
    'src/Utils.js',
    'src/SanityCheck.js',
    'src/DigestAuthentication.js',
    'src/WebRTC.js'
  ];

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    meta: {
      banner: '\
/*\n\
 * ExSIP version <%= pkg.version %>\n\
 * Copyright (c) <%= grunt.template.today("yyyy") %> BroadSoft, Inc.\n\
 * Homepage: http://www.broadsoft.com\n\
 * Fork of JsSIP 0.3.7\n\
 * Copyright (c) 2012-2013 José Luis Millán - Versatica <http://www.versatica.com>\n\
 * License: MIT\n\
 */\n\n\n',
      footer: '\
\n\n\nwindow.ExSIP = ExSIP;\n\
}(window));\n\n'
    },
    clean: ["dist"],
    concat: {
      dist: {
        src: srcFiles,
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
        options: {
          banner: '<%= meta.banner %>',
          separator: '\n\n\n',
          footer: '<%= meta.footer %>',
          process: true
        },
        nonull: true
      },
      post_dist: {
        src: [
          'dist/<%= pkg.name %>-<%= pkg.version %>.js',
          'src/Grammar/dist/Grammar.js'
        ],
        dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
        nonull: true
      },
      devel: {
        src: srcFiles,
        dest: 'dist/<%= pkg.name %>-devel.js',
        options: {
          banner: '<%= meta.banner %>',
          separator: '\n\n\n',
          footer: '<%= meta.footer %>',
          process: true
        },
        nonull: true
      },
      post_devel: {
        src: [
          'dist/<%= pkg.name %>-devel.js',
          'src/Grammar/dist/Grammar.js'
        ],
        dest: 'dist/<%= pkg.name %>-devel.js',
        nonull: true
      }
    },
    includereplace: {
      dist: {
        files: {
          'dist': 'dist/<%= pkg.name %>-<%= pkg.version %>.js'
        }
      },
      devel: {
        files: {
          'dist': 'dist/<%= pkg.name %>-devel.js'
        }
      }
    },
    jshint: {
      dist: 'dist/<%= pkg.name %>-<%= pkg.version %>.js',
      devel: 'dist/<%= pkg.name %>-devel.js',
      options: {
        browser: true,
        curly: true,
        eqeqeq: true,
        immed: true,
        latedef: true,
        newcap: false,
        noarg: true,
        sub: true,
        undef: true,
        boss: true,
        eqnull: true,
        onecase:true,
        unused:true,
        supernew: true
      },
      globals: {}
    },
    uglify: {
      dist: {
        files: {
          'dist/<%= pkg.name %>-<%= pkg.version %>.min.js': ['dist/<%= pkg.name %>-<%= pkg.version %>.js']
        }
      },
      options: {
        banner: '<%= meta.banner %>'
      }
    },
    qunit: {
      noWebRTC: ['test/run-TestNoWebRTC.html'],
      withWebRTC: ['test/run-TestWebRTC.html']
    },
    "qunit-serverless": {
      all: {
        options: {
          includeFiles: ["dist/exsip-devel.js", "test/includes/*.js"],
          testFiles: ["test/test-*.js"],
          qunitJs: "test/qunit/qunit-1.11.0.js"
        }
      }
    },
    watch: {
      develop: {
        files: ['test/*.js', 'test/includes/*.js', 'src/*.js', 'src/RTCSession/*.js'],
        tasks: ['bump', 'build','copy:deploy_devel','copy:deploy_min','test'],
        options: {
          spawn: true,
          verbose: true
        }
      }
    },
    copy: {
      deploy_devel: {
        src: 'dist/<%= pkg.name %>-devel.js',
        dest: '../webrtc/js/<%= pkg.name %>-devel.js'
      },
      deploy_min: {
        src: 'dist/<%= pkg.name %>-<%= pkg.version %>.min.js',
        dest: '../webrtc/js/<%= pkg.name %>.js'
      }
    },
    notify: {
      qunit: {
        options: {
          title: 'Tests finished',  // optional
          message: 'Tests run successfully' //required
        }
      }
    },
    bump: {
      files: [ 'package.json'],
      options: {
        part: 'patch',
        onBumped: function ( data ) {
          var currentFile = data.task.filesSrc[ data.index ];
          if ( ( /package.json/ ).test( currentFile ) ) {
            grunt.config( 'pkg', grunt.file.readJSON( currentFile ) );
          }
        }
      }
    }
  });


  // Load Grunt plugins.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-include-replace');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks("grunt-qunit-serverless");
  grunt.loadNpmTasks('grunt-notify');
  grunt.loadNpmTasks('grunt-bumpx');
  grunt.loadNpmTasks('grunt-contrib-clean');

  // Task for building ExSIP Grammar.js and Grammar.min.js files.
  grunt.registerTask('grammar', function(){
    var done = this.async();  // This is an async task.
    var sys = require('sys');
    var exec = require('child_process').exec;
    var child;

    // First compile ExSIP grammar with PEGjs.
    console.log('"grammar" task: compiling ExSIP PEGjs grammar into Grammar.js ...');
    child = exec('if [ -x "./node_modules/pegjs/bin/pegjs" ] ; then PEGJS="./node_modules/pegjs/bin/pegjs"; else PEGJS="pegjs" ; fi && $PEGJS -e ExSIP.Grammar src/Grammar/src/Grammar.pegjs src/Grammar/dist/Grammar.js', function(error, stdout, stderr) {
      if (error) {
        sys.print('ERROR: ' + stderr);
        done(false);  // Tell grunt that async task has failed.
      }
      console.log('OK');

      // Then modify the generated Grammar.js file with custom changes.
      console.log('"grammar" task: applying custom changes to Grammar.js ...');
      var fs = require('fs');
      var grammar = fs.readFileSync('src/Grammar/dist/Grammar.js').toString();
      var modified_grammar = grammar.replace(/throw new this\.SyntaxError\(([\s\S]*?)\);([\s\S]*?)}([\s\S]*?)return result;/, 'new this.SyntaxError($1);\n        return -1;$2}$3return data;');
      fs.writeFileSync('src/Grammar/dist/Grammar.js', modified_grammar);
      console.log('OK');
      done();  // Tell grunt that async task has succeeded.

    });
  });


  // Task for building exsip-devel.js (uncompressed), exsip-X.Y.Z.js (uncompressed)
  // and exsip-X.Y.Z.min.js (minified).
  // Both exsip-devel.js and exsip-X.Y.Z.js are the same file with different name.
  grunt.registerTask('build', ['clean', 'concat:devel', 'includereplace:devel', 'jshint:devel', 'concat:post_devel', 'concat:dist', 'includereplace:dist', 'jshint:dist', 'concat:post_dist', 'uglify:dist']);

  // Task for building exsip-devel.js (uncompressed).
  grunt.registerTask('devel', ['concat:devel', 'includereplace:devel', 'jshint:devel', 'concat:post_devel']);

  // Test tasks.
  grunt.registerTask('test', ['qunit-serverless', 'notify:qunit']);

  // Travis CI task.
  // Doc: http://manuel.manuelles.nl/blog/2012/06/22/integrate-travis-ci-into-grunt/
  grunt.registerTask('travis', ['grammar', 'devel', 'test']);

  // Default task is an alias for 'build'.
  grunt.registerTask('default', ['build']);

};
