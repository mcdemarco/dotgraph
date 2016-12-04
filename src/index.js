var filesaver = require("filesaver.js-npm");

window.onload = function() {
	if (typeof(window.DotGraph) == "undefined") {

		window.DotGraph = {

			settings: {checkpoint: true,
								 checkpointTag: "checkpoint",
								 cluster: false,
								 colorBW: true,
								 colorByNode: true,
								 colorByTag: false,
								 ends: true,
								 endTag: "End",
								 rotation: 0,
								 showNodeNames: false,
								 palette: ["#FEAF16", "#2ED9FF", "#DEA0FD", "#FE00FA", "#F7E1A0",
													 "#16FF32", "#3283FE", "#1C8356", "#FBE426", "#FA0087",
													 "#F8A19F", "#1CBE4F", "#C4451C", "#C075A6", "#90AD1C", 
													 "#B00068", "#AA0DFE", "#FC1CBF", "#1CFFCE", "#F6222E", 
													 "#85660D", "#325A9B", "#B10DA1", "#a0a0a0", "#782AB6",
													 "#565656"]
								},

			story: {title: "Untitled", 
							startNode: 1, 
							startNodeName: "Start", 
							leaves: 0, 
							links: 0,
							tightEnds: 0,
							avLength: 1,
							maxLength: 1,
							passages: [],
							tags: [],
							tagObject: [],
							targets: {}
						 },
 
			
			convert: function() {

				//Get the dot graph source.
				var output = this.export();

				//Write the dot graph text to the page.
				var dotTextarea = document.getElementById("dotfile");
				dotTextarea.value = output;
				dotTextarea.style.height = dotTextarea.scrollHeight+'px'; 

				//Do the conversion and write the svg to the page.
				document.getElementById("graph").innerHTML = Viz(output,"svg");

			},

			
			edit: function() {
				//The user can edit the dot graph and rerender it.
				var editedOutput = document.getElementById("dotfile").value;
				document.getElementById("graph").innerHTML = Viz(editedOutput,"svg");
			},

			
			export: function() {
				//Parse the story and return the dot graph source.
				var buffer = [];
				var rotations = ["TB","LR","BT","RL"];
				this.parseSettings();

				//Only reparse if necessary.
				if (this.story.passages.length == 0)
					this.parseStory();

				buffer.push("digraph " + this.story.title + " {\r\n");
				buffer.push("rankdir=" + rotations[this.settings.rotation] + "\r\n\r\n");

				if (this.settings.cluster)
					buffer.push(this.writeClusterCode(this.story.tagObject));
				else if (this.settings.colorByTag) {
					buffer.push(this.writeTagKey(this.story,this.settings));
				}

				document.getElementById("nodeCount").innerHTML = this.story.passages.length;
				
				for (var i = 0; i < this.story.passages.length; ++i) {
					buffer.push(this.parsePassageFromObject(this.story.passages[i]));
				}

				buffer.push("}\r\n");
				
				document.getElementById("nodeCount").innerHTML = this.story.passages.length;
				document.getElementById("leafCount").innerHTML = this.story.leaves;
				document.getElementById("linkCount").innerHTML = this.story.links;
				if (this.settings.ends) {
					var looseEnds = this.story.leaves - this.story.tightEnds;
					document.getElementById("looseCount").innerHTML = " (including " + looseEnds + " loose end" + (looseEnds != 1 ? "s" : "") + ")";
				} else {
					document.getElementById("looseCount").innerHTML = "";
				}
				document.getElementById("average").innerHTML = Math.round(100 * (this.story.links / this.story.passages.length))/100;

				return buffer.join('');
			},

			
			getFirstTag: function(passage) {
				var tagArray = passage.tagArray.slice(0);
				if (this.settings.ends && tagArray.indexOf(this.settings.endTag) > -1) {
					tagArray.splice(tagArray.indexOf(this.settings.endTag), 1);
				}
				if (this.settings.checkpoints && tagArray.indexOf(this.settings.checkpointTag) > -1)
					tagArray.splice(tagArray.indexOf(this.settings.checkpointTag), 1);
				if (tagArray.length)
					return tagArray[0];
				else
					return "";
			},

			
			getIdFromTarget: function(target) {
				var scrubbedTarget = this.scrub(target);
				if (this.story.targets.hasOwnProperty(scrubbedTarget))
					return this.story.targets[scrubbedTarget];
				else
					return scrubbedTarget;
			},

						
			hasTag: function(passage, tag) {
				if (passage.tagArray.indexOf(tag) > -1)
					return true;
				else
					return false;
			},


			parsePassageFromObject: function(passage) {
				var name = passage.scrubbedTitleOrPid;
				var pid = passage.pid;
				var styles = [];

				if (pid == this.story.startNode) {
					styles.push("shape=doublecircle");
				} else if (this.settings.ends && this.hasTag(passage, this.settings.endTag)) {
						styles.push("shape=egg");
				} else if (this.settings.checkpoints && this.hasTag(passage, this.settings.checkpointTag)) {
						styles.push("shape=diamond");
				}
				var content = passage.content;
				var firstTag = passage.firstTag;
				
				return this.parsePassage(passage, styles);
			},

	
			parsePassage: function(passage, styles) {
				var scrubbedTitleOrPid = passage.scrubbedTitleOrPid;
				var content = passage.content;
				var tag = passage.firstTag;
				var result = [];
				var hue = 0;
				var parsedLinks = this.parseLinks(content, scrubbedTitleOrPid);
				this.story.links += parsedLinks.length;

				if (parsedLinks.length === 0)
					this.story.leaves++;

				if (styles.length === 0 && parsedLinks.length === 0) {
					//We are at a terminal passage that isn't already styled as the start or an end.
					styles.push("style=\"filled,diagonals\"");
				} else if (styles.length) {
					styles.push("style=\"filled,bold\"");
				}	else if (!this.settings.colorBW) {
					styles.push("style=filled");
				}
				
				if (this.settings.colorByNode) {
					hue = Math.round(100 * (Math.min(1.75, content.length / this.story.avLength)) / 3)/100;  //HSV red-to-green range
					styles.push("fillcolor=\"" + hue + ",0.66,0.85\"");
				} else if (this.settings.colorByTag && tag) {
					var indx = this.story.tags.indexOf(tag);
					if (indx > -1)
						hue = this.settings.palette[indx%26]; //color alphabet colors
					styles.push("fillcolor=\"" + hue + "\"");
				}

				//Push the node, in case there are no links.
				result.push(scrubbedTitleOrPid);
				styles.push("tooltip=" + passage.scrubbedTitle);

				result.push(" [" + styles.join(' ') + "]");
				result.push("\r\n", parsedLinks.join("\r\n"), "\r\n");
				
				return result.join('');
			},

			
			parsePassageName: function(passage,returnName) {
				//Sometimes used to get the real name (returnName), sometimes the pids.
				var name;
				if (this.settings.showNodeNames || returnName) {
					name = this.scrub(passage.name);
				} else {
					name = passage.pid ? passage.pid : this.scrub("Untitled Passage");
				}
				return name;
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

			
			parseLinks: function(content, titleOrPid) {
				var linkGraph = [];
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
							linkGraph.push(titleOrPid + " -> " + (this.settings.showNodeNames ? this.scrub(target) : this.getIdFromTarget(target)));
						}
					}
				}
				
				return linkGraph;
			},

			
			rotate: function() {
				this.settings.rotation = (this.settings.rotation + 1)%4;
				this.convert();
			},

			
			scale: function() {
				var svgElt = document.getElementsByTagName("svg")[0];
				svgElt.setAttribute("width","100%");
				svgElt.removeAttribute("height");
			},


			save: function(mimeType) {
				var blob;
				var output = document.getElementById("dotfile").value;
				if (mimeType == "txt") {
					blob = new Blob([output], {type: "text/plain;charset=utf-8"});
					filesaver.saveAs(blob, "dot" + Date.now() + ".txt", true);
				} else if (mimeType == "svg") {
					//Having trouble reading this off the page, so regenerate it.
					var preblob = Viz(output,"svg").replace("no","yes");
					blob = new Blob([preblob], {type: "image/svg+xml;charset=utf-8"});
					filesaver.saveAs(blob, "dotgraph" + Date.now() + ".svg", true);
				}
			},


			scrub: function(title) {
				if (title) { // dangerously scrubbing non-ascii characters for graphviz bug
					title = title.replace(/"/gm,"\\\"").replace(/[^\x00-\x7F]/g, "");
					title = '"' + title + '"';
				}
				return title;
			},


			parseSettings: function() {
				this.settings.checkpoints = document.getElementById("checkpointsCheckbox") ? document.getElementById("checkpointsCheckbox").checked : false;
				this.settings.cluster = document.getElementById("clusterCheckbox") ? document.getElementById("clusterCheckbox").checked : false;
				this.settings.colorBW = document.getElementById("colorCheckbox0") ? document.getElementById("colorCheckbox0").checked : false;
				this.settings.colorByNode = document.getElementById("colorCheckbox1") ? document.getElementById("colorCheckbox1").checked : false;
				this.settings.colorByTag = document.getElementById("colorCheckbox2") ? document.getElementById("colorCheckbox2").checked : false;
				this.settings.ends = document.getElementById("endsCheckbox") ? document.getElementById("endsCheckbox").checked : false;
				this.settings.showNodeNames = document.getElementById("nodeCheckbox") ? document.getElementById("nodeCheckbox").checked : false;
			},

			
			parseStory: function() {
				//Parse the story from the relevant Twine 1 or Twine 2 source data.
				//Avoid division by zero in corner case by pretending we have non-empty passages.
				//Note that we haven't cleaned out comments yet, and never clean script,
				//so the passage lengths may be inaccurate.
				var p;
				var source;

				//Detecting twine version here.
				var storyTwine1 = window.document.getElementById("storeArea");
				var storyData = window.document.getElementsByTagName("tw-storydata");

				if (storyTwine1) {
					var title = "Untitled Story";
					if (storyTwine1.querySelectorAll('[tiddler="StoryTitle"]').length) {
						title = storyTwine1.querySelectorAll('[tiddler="StoryTitle"]')[0].innerText;
						storyTwine1.removeChild(storyTwine1.querySelectorAll('[tiddler="StoryTitle"]')[0]);
					}
					this.story.title = this.scrub(title);

					//Remove more extraneous Twine 1.x passages.
					if (storyTwine1.querySelectorAll('[tiddler="StoryAuthor"]').length) {
						storyTwine1.removeChild(storyTwine1.querySelectorAll('[tiddler="StoryAuthor"]')[0]);
					}
					if (storyTwine1.querySelectorAll('[tiddler="StorySubtitle"]').length) {
						storyTwine1.removeChild(storyTwine1.querySelectorAll('[tiddler="StorySubtitle"]')[0]);
					}
					if (storyTwine1.querySelectorAll('[tiddler="StoryMenu"]').length) {
						storyTwine1.removeChild(storyTwine1.querySelectorAll('[tiddler="StoryMenu"]')[0]);
					}
					if (storyTwine1.querySelectorAll('[tiddler="StorySettings"]').length) {
						storyTwine1.removeChild(storyTwine1.querySelectorAll('[tiddler="StorySettings"]')[0]);
					}
					if (storyTwine1.querySelectorAll('[tiddler="StoryIncludes"]').length) {
						storyTwine1.removeChild(storyTwine1.querySelectorAll('[tiddler="StoryIncludes"]')[0]);
					}

					source = storyTwine1.querySelectorAll("div[tiddler]");
				} else if (storyData) {
					this.story.title = this.scrub(storyData[0].getAttribute("name"));
					this.story.startNode = storyData[0].getAttribute("startnode");
					source = document.querySelectorAll("tw-passagedata");
				} else {
					this.story.title = "Untitled";
					this.story.startNode = 1;
					source = document.querySelectorAll("tw-passagedata");
				}

				for (p = 0; p < source.length; p++) {
					if (storyTwine1 && source[p].getAttribute("tiddler") == "Start") {
						//Couldn't do this until source was cleaned.
						this.story.startNode = p;
					}
					this.story.passages[p] = {};
					this.story.passages[p].content = source[p].innerText;
					this.story.passages[p].textLength = this.story.passages[p].content.length;
					//Make it like Twine2.
					this.story.passages[p].pid = source[p].getAttribute("pid") ? source[p].getAttribute("pid") : p;
					this.story.passages[p].tagArray = (source[p].getAttribute("tags") ? source[p].getAttribute("tags").split(" ") : []);
					this.story.passages[p].name = source[p].getAttribute("name") ? source[p].getAttribute("name") :
						(source[p].getAttribute("tiddler") ? source[p].getAttribute("tiddler") : "Untitled Passage");
					this.story.passages[p].scrubbedTitle = this.parsePassageName(this.story.passages[p],true);
					this.story.passages[p].scrubbedTitleOrPid = this.parsePassageName(this.story.passages[p]);
				}

				this.story.leaves = 0;
				this.story.links = 0;
				this.story.tightEnds = 0;
				
				this.story.tagObject = {};
				this.story.tags = [];
				this.story.targets = {};
				for (p = 0; p < this.story.passages.length; p++) {
					if (this.settings.ends) {
						if (this.hasTag(this.story.passages[p],this.settings.endTag))
							this.story.tightEnds++;
					}

					if (this.story.passages[p].pid == this.story.startNode)
						this.story.startNodeName = this.story.passages[p].scrubbedTitleOrPid;
					
					this.story.passages[p].firstTag = this.getFirstTag(this.story.passages[p]);
					if (this.story.passages[p].firstTag) {
						if (!this.story.tagObject.hasOwnProperty(this.story.passages[p].firstTag)) {
							this.story.tagObject[this.story.passages[p].firstTag] = [];
							this.story.tags.push(this.story.passages[p].firstTag);
						}
						this.story.tagObject[this.story.passages[p].firstTag].push(this.story.passages[p].scrubbedTitleOrPid);
					}

					this.story.targets[this.story.passages[p].scrubbedTitle] = this.story.passages[p].pid;
				};

				this.story.maxLength = this.story.passages.reduce(function(acc,pasg) { return Math.max(acc,pasg.textLength); }, 1);
				this.story.avLength = this.story.passages.reduce(function(acc,pasg) { return acc + pasg.textLength; }, 0) / this.story.passages.length;

			},

				
			writeClusterCode: function(tagObject) {
				var clusters = ""; //For repeated presses of the button.
				var clusterIndex = 0;
				for (var tag in tagObject) {
					if (tagObject.hasOwnProperty(tag)) {
						clusters += "subgraph cluster_" + clusterIndex + " {\r\n";
						clusters += "label=" + this.scrub(tag) + "\r\n";
						clusters += "style=\"rounded, filled\" fillcolor=\"ivory\"\r\n";
						clusters += tagObject[tag].join(" \r\n") + "}\r\n\r\n";
						clusterIndex++;
					}
				}
				return clusters;
			},


			writeTagKey: function(story,settings) {
				var tagKey = "{rank=source\r\nstyle=\"rounded, filled\"\r\n";
				var tagName;
				for (var t=0; t<story.tags.length; t++) {
					tagName = this.scrub(this.story.tags[t]);
					tagKey += tagName + " [shape=rect ";
					tagKey += "style=\"filled,rounded\" fillcolor=\"" + settings.palette[t%26] + "\"]\r\n";
				}
				tagKey += "}\r\n";
				
				var startName = (settings.showNodeNames ? story.startNodeName : story.startNode);
				for (t=0; t<story.tags.length; t++)
					tagKey += this.scrub(story.tags[t]) + " -> " + startName + " [style=invis]\r\n";

				return tagKey;
			}
		};		
	};

	window.DotGraph.convert();

};
