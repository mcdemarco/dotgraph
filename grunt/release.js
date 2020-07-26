module.exports = function(grunt) {
	var pkg = require('../package.json');

	grunt.loadNpmTasks('grunt-contrib-compress');
	grunt.config.merge({
		compress: {
			main: {
				options: {
					archive: 'release.zip'
				},
				files: [
					{expand: true,
					 flatten: true, 
					 cwd: 'dist/Twine2/online/DotGraph/',
					 src: ['*.*'],
					 dest: 'dotgraph-2/'},
					{expand: true,
					 flatten: true, 
					 cwd: 'dist/Twine2/offline/DotGraph/',
					 src: ['*.*'],
					 dest: 'dotgraph-2-offline/'},
					{expand: true,
					 flatten: true, 
					 cwd: 'dist/Twine1/online/DotGraph/',
					 src: ['*.*'],
					 dest: 'dotgraph-1/'},
					{expand: true,
					 flatten: true, 
					 cwd: 'dist/Twine1/offline/DotGraph/',
					 src: ['*.*'],
					 dest: 'dotgraph-1-offline/'},
					{expand: true,
					 flatten: true, 
					 cwd: 'snowstick/',
					 src: ['*.*'],
					 dest: 'SnowStick/'},
					{expand: true,
					 cwd: './',
					 src: ['LICENSE','README.md'],
					 dest: '/'
					}
				]
			}
		}
	});


	grunt.registerTask('zip', "Zip files for GitHub releases", ['compress']);

	grunt.registerTask('release', ['clean', 'package', 'zip']);

};
