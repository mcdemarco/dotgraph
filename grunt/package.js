module.exports = function(grunt) {
	var pkg = require('../package.json');

	grunt.registerTask('package:format', function() {
		var formatData = {
			description: pkg.description,
			author: pkg.author.replace(/ <.*>/, ''),
			image: 'icon.svg',
			name: pkg.name,
			url: pkg.repository,
			version: pkg.version,
			proofing: true,
			source: grunt.file.read('build/format.html')
		};

		grunt.file.write(
			'dist/Twine2/online/' + pkg.name + '/format.js',
			'window.storyFormat(' + JSON.stringify(formatData) + ');'
		);

		grunt.file.copy('src/icon.svg', 'dist/Twine2/online/' + pkg.name + '/icon.svg');
	});

	grunt.registerTask('package:offline', function() {
		var formatData = {
			description: pkg.description,
			author: pkg.author.replace(/ <.*>/, ''),
			image: 'icon.svg',
			name: pkg.name,
			url: pkg.repository,
			version: pkg.version,
			proofing: true,
			source: grunt.file.read('build/offline/format.html')
		};

		grunt.file.write(
			'dist/Twine2/offline/' + pkg.name + '/format.js',
			'window.storyFormat(' + JSON.stringify(formatData) + ');'
		);

		grunt.file.copy('src/icon.svg', 'dist/Twine2/offline/' + pkg.name + '/icon.svg');
	});

	grunt.registerTask('package:header', function() {
		grunt.file.copy('build/header.html', 'dist/Twine1/online/' + pkg.name + '/header.html');
	});

	grunt.registerTask('package:offline1', function() {
		grunt.file.copy('build/offline/header.html', 'dist/Twine1/offline/' + pkg.name + '/header.html');
	});

	grunt.registerTask('package', ['build:release', 'package:format', 'package:offline', 'package:header', 'package:offline1']);
};
