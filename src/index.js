window.onload = function() {
	if (typeof(window.DotGraph) == "undefined") {

		window.DotGraph = {

			convert: function() {
				var output = this.export();
				document.getElementById("dotfile").innerHTML = output;
				document.getElementById("graph").innerHTML = Viz(output,"svg");
			},

			
			export: function() {
				var buffer = [];

				buffer.push("digraph ");

				var storyData = window.document.getElementsByTagName("tw-storydata");
				if (storyData) {
					buffer.push(this.scrub(storyData[0].getAttribute("name")));
				} else {
					buffer.push("UNTITLED");
				}

				buffer.push(" {\r\n\r\n");

				var passages = window.document.getElementsByTagName("tw-passagedata");
				for (var i = 0; i < passages.length; ++i) {
					buffer.push(this.buildPassageFromElement(passages[i]));
				}

				buffer.push("}\r\n");

				return buffer.join('');
			},

			
			buildPassageFromElement: function(passage) {
				var name = passage.getAttribute("name");
				var tags;
				if (!name) {
					name = this.scrub("Untitled Passage");
				} else if (name == "Start") {
					tags = ("style=filled");
				}
				var content = passage.textContent;
				
				return this.buildPassage(name, tags, content);
			},
	
	
			buildPassage: function(title, tags, content) {
				var result = [];
				var scrubbedTitle = this.scrub(title);
				
				result.push(scrubbedTitle); //Push the node, in case there are no links.
				if (tags) {
					result.push(" [",tags,"]");
				}
				result.push("\r\n", this.extractLinks(content, scrubbedTitle),"\r\n");
				
				return result.join('');
			},

			
			extractLink: function(target) {
				//Parsing code for the various formats adapted from Snowman.

				// display|target format

				var barIndex = target.indexOf('|');

				if (barIndex != -1) {
					target = target.substr(barIndex + 1);
				} else {
					// display->target format
					
					var rightArrIndex = target.indexOf('->');
					
					if (rightArrIndex != -1) {
						target = target.substr(rightArrIndex + 2);
					} else {
						// target<-display format
						
						var leftArrIndex = target.indexOf('<-');
						
						if (leftArrIndex != -1) {
							target = target.substr(0, leftArrIndex);
						}
					}
				}
				return target;
			},

			
			extractLinks: function(content, title) {
				var linkGraph = "";
				var re = /\[\[(.*?)\]\]/g;
				var targetArray;
				if (content) {
					//Clean up the content a bit, then extract links.
					// Remove /* comments */
					content = content.replace(/\/\*.*\*\//g, '');
					// Remove (starting) // comments
					content = content.replace(/^\/\/.*(\r\n?|\n)/g, '');
					
					while ((targetArray = re.exec(content)) !== null) {
						var target = this.extractLink(targetArray[1]);
						if (/^\w+:\/\/\/?\w/i.test(target)) {
							// do nothing with external links
						}	else {
							linkGraph += title + " -> " + this.scrub(target) + "\r\n";
						}
					}
				}
				return linkGraph;
			},

			
			scrub: function(title) {
				if (title) {
					title = title.replace(/"/gm,"\\\"");
					title = '"' + title + '"';
				}
				return title;
			}

		};		
	};

	window.DotGraph.convert();
};
