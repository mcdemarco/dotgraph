window.onload = function() {
	if (typeof(window.DotGraph) == "undefined") {

		window.DotGraph = {

			maxLength: 1,
			startNode: 1,
			storyTitle: "UNTITLED",
			
			convert: function() {
				var output = this.export();
				document.getElementById("dotfile").innerHTML = output;
				document.getElementById("graph").innerHTML = Viz(output,"svg");
			},

			
			export: function() {
				var buffer = [];
				this.setVariables();

				buffer.push("digraph " + this.storyTitle + " {\r\n\r\n");

				var passages = window.document.getElementsByTagName("tw-passagedata");
				for (var i = 0; i < passages.length; ++i) {
					buffer.push(this.parsePassageFromElement(passages[i]));
				}

				buffer.push("}\r\n");

				return buffer.join('');
			},

			
			parsePassageFromElement: function(passage) {
				var name = passage.getAttribute("name");
				var tags = [];

				if (passage.getAttribute("pid") == this.startNode) {
					tags.push("shape=doublecircle");
				}
				if (!name) {
					name = this.scrub("Untitled Passage");
				}
				var content = passage.textContent;
				
				return this.parsePassage(name, tags, content);
			},
	
	
			parsePassage: function(title, tags, content) {
				var result = [];
				var scrubbedTitle = this.scrub(title);

				tags.push("style=filled");
				var hue = Math.round(100 * (content.length / this.maxLength) / 3)/100;  //HSV red-to-green range
				tags.push("fillcolor=\"" + hue + ",.66,.85\"");
				
				result.push(scrubbedTitle); //Push the node, in case there are no links.
				if (tags) {
					result.push(" [" + tags.join(' ') + "]");
				}
				result.push("\r\n", this.parseLinks(content, scrubbedTitle),"\r\n");
				
				return result.join('');
			},

			
			parseLink: function(target) {
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

			
			parseLinks: function(content, title) {
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
						var target = this.parseLink(targetArray[1]);
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
			},

			
			setVariables: function() {
				//Avoid division by zero in corner case by pretending we have non-empty passages.
				//Note that we haven't cleaned out comments yet, and never clean script,
				//so the maxLength may be too long.
				var storyData = window.document.getElementsByTagName("tw-storydata");
				
				if (storyData) {
					this.storyTitle = this.scrub(storyData[0].getAttribute("name"));
					this.startNode = storyData[0].getAttribute("startnode");
				} else {
					this.storyTitle = "UNTITLED";
				}

				var passages = document.querySelectorAll("tw-passagedata");
				for (var p = 0; p < passages.length; p++) {
					if (passages[p].innerText.length > this.maxLength)
						this.maxLength = passages[p].innerText.length;
				}
			}

		};		
	};

	window.DotGraph.convert();
};
