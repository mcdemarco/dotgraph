module.exports = function(grunt) {
	var pkg = require('../package.json');

	grunt.registerTask('package:format', "Package Twine 2 online story format", function() {
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

	grunt.registerTask('package:offline', "Package Twine 2 offline story format", function() {
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

	grunt.registerTask('package:twine1', "Package Twine 1 story format versions", function() {
		grunt.file.copy('build/header.html', 'dist/Twine1/online/' + pkg.name + '/header.html');
		grunt.file.copy('build/offline/header.html', 'dist/Twine1/offline/' + pkg.name + '/header.html');
	});

	grunt.registerTask('package', ['build:release', 'package:format', 'package:offline', 'package:twine1']);

};
