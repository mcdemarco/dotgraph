var _ = require('underscore');

module.exports = function(grunt) {
	grunt.config.merge({
		browserify: {
			default: {
				files: {
					'build/dotgraph.js': 'src/index.js'
				},
				options: {
					browserifyOptions: {
						debug: true,
						detectGlobals: false
					},
					watch: true
				}
			},
			release: {
				files: {
					'build/dotgraph.js': 'src/index.js'
				},
				options: {
					browserifyOptions: {
						debug: false,
						detectGlobals: false
					},
					transform: [['uglifyify', { global: true }]]
				}
			}
		},
		watch: {
			template: {
				files: 'src/index.html',
				tasks: ['html']
			}
		}
	});

	grunt.registerTask('html:release', function() {
		var template = _.template(grunt.file.read('src/index.html'));

		var data = {
			name: '{{STORY_NAME}}',
			passages: '{{STORY_DATA}}',
			script: '<script>' + grunt.file.read('build/dotgraph.js') + '</script>'
		};

		grunt.file.write('build/format.html', template(data));
	});

	grunt.registerTask('build', ['browserify:default']);
	grunt.registerTask('build:release', ['browserify:release', 'html:release']);
	grunt.registerTask('default', ['build']);
	grunt.registerTask('dev', ['build', 'watch']);
};
