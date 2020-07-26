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

	grunt.registerTask('html:release', "Build Twine 2 online story format", function() {
		var template = _.template(grunt.file.read('src/index.html'));

		var data = {
			name: '{{STORY_NAME}}',
			passages: '{{STORY_DATA}}',
			vizScript: '<script src="https://mcdemarco.net/tools/viz/viz.js" type="text/javascript"></script><script src="https://mcdemarco.net/tools/viz/full.render.js" type="text/javascript"></script>',
			script: '<script>' + grunt.file.read('build/dotgraph.js') + '</script>'
		};

		grunt.file.write('build/format.html', template(data));
	});

	grunt.registerTask('html:offline', "Build Twine 2 offline story format", function() {
		var template = _.template(grunt.file.read('src/index.html'));

		var data = {
			name: '{{STORY_NAME}}',
			passages: '{{STORY_DATA}}',
			vizScript: '<script>'  + grunt.file.read('lib/viz.js') + '</script><script>'  + grunt.file.read('lib/full.render.js') + '</script>',
			script: '<script>' + grunt.file.read('build/dotgraph.js') + '</script>'
		};

		grunt.file.write('build/offline/format.html', template(data));
	});

	grunt.registerTask('html:release1', "Build Twine 1 online story format", function() {
		var template = _.template(grunt.file.read('src/index.html'));

		var data = {
			name: 'DotGraph',
			passages: '<div id="storeArea" data-size="STORY_SIZE" hidden>"STORY"</div>',
			vizScript: '<script src="https://mcdemarco.net/tools/viz/viz.js" type="text/javascript"></script><script src="https://mcdemarco.net/tools/viz/full.render.js" type="text/javascript"></script>',
			script: '<script>' + grunt.file.read('build/dotgraph.js') + '</script>'
		};

		grunt.file.write('build/header.html', template(data));
	});

	grunt.registerTask('html:offline1', "Build Twine 1 offline story format", function() {
		var template = _.template(grunt.file.read('src/index.html'));

		var data = {
			name: 'DotGraph',
			passages: '<div id="storeArea" data-size="STORY_SIZE" hidden>"STORY"</div>',
			vizScript: '<script>'  + grunt.file.read('lib/viz.js') + '</script><script>'  + grunt.file.read('lib/full.render.js') + '</script>',
			script: '<script>' + grunt.file.read('build/dotgraph.js') + '</script>'
		};

		grunt.file.write('build/offline/header.html', template(data));
	});

	grunt.registerTask('build', ['browserify:default']);
	grunt.registerTask('build:release', ['browserify:release', 'html:release', 'html:offline', 'html:release1', 'html:offline1']);
	grunt.registerTask('default', ['build']);
	grunt.registerTask('dev', ['build', 'watch']);
};
