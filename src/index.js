window.onload = function() {
	if (typeof(window.DotGraph) == "undefined") {

		window.DotGraph = {

			checkpoint: true,
			checkpointTag: "checkpoint",
			cluster: false,
			clusters: "",
			colorBW: true,
			colorByNode: true,
			colorByTag: false,
			ends: true,
			endTag: "End",
			hueList: [],
			leaves: 0,
			links: 0,
			maxLength: 1,
			rotation: 0,
			showNodeNames: true,
			startNode: 1,
			startNodeName: "Start",
			storyTitle: "Untitled",
			tagList: [],
			targetObject: {},
			tightEnds: 0,
			
			convert: function() {
				var output = this.export();
				var dotTextarea = document.getElementById("dotfile");
				dotTextarea.value = output;
				dotTextarea.style.height = dotTextarea.scrollHeight+'px'; 
				document.getElementById("graph").innerHTML = Viz(output,"svg");
			},

			
			edit: function() {
				var output = document.getElementById("dotfile").value;
				document.getElementById("graph").innerHTML = Viz(output,"svg");
			},

			
			export: function() {
				var buffer = [];
				var rotations = ["TB","LR","BT","RL"];
				this.setVariables();

				buffer.push("digraph " + this.storyTitle + " {\r\n");
				buffer.push("rankdir=" + rotations[this.rotation] + "\r\n\r\n");

				if (this.cluster)
					buffer.push(this.clusters);
				else if (this.colorByTag) {
					buffer.push(this.tagKey());
				}

				var passages = window.document.getElementsByTagName("tw-passagedata");
				document.getElementById("nodeCount").innerHTML = passages.length;
				
				for (var i = 0; i < passages.length; ++i) {
					buffer.push(this.parsePassageFromElement(passages[i]));
				}

				buffer.push("}\r\n");
				
				document.getElementById("nodeCount").innerHTML = passages.length;
				document.getElementById("leafCount").innerHTML = this.leaves;
				document.getElementById("linkCount").innerHTML = this.links;
				if (this.ends) {
					var looseEnds = this.leaves - this.tightEnds;
					document.getElementById("looseCount").innerHTML = " (including " + looseEnds + " loose ends)";
				} else {
					document.getElementById("looseCount").innerHTML = "";
				}
				document.getElementById("average").innerHTML = Math.round(100 * (this.links / passages.length))/100;

				return buffer.join('');
			},

			
			getFirstTag: function(passage) {
				var tagArray = passage.getAttribute("tags").split(" ");
				if (this.ends && tagArray.indexOf(this.endTag) > -1) {
					tagArray.splice(tagArray.indexOf(this.endTag), 1);
				}
				if (this.checkpoints && tagArray.indexOf(this.checkpointTag) > -1)
					tagArray.splice(tagArray.indexOf(this.checkpointTag), 1);
				if (tagArray.length)
					return tagArray[0];
				else
					return "";
			},

			
			getIdFromTarget: function(target) {
				var scrubbedTarget = this.scrub(target);
				if (this.targetObject.hasOwnProperty(scrubbedTarget))
					return this.targetObject[scrubbedTarget];
				else
					return scrubbedTarget;
			},

						
			hasTag: function(passage, tag) {
				var tags = passage.getAttribute("tags").split(" ");
				if (tags.indexOf(tag) > -1)
					return true;
				else
					return false;
			},

			
			parsePassageFromElement: function(passage) {
				var name = this.parsePassageName(passage);
				var pid = passage.getAttribute("pid");
				var styles = [];

				if (pid == this.startNode) {
					styles.push("shape=doublecircle");
				} else if (this.ends && this.hasTag(passage, this.endTag)) {
						styles.push("shape=egg");
				} else if (this.checkpoints && this.hasTag(passage, this.checkpointTag)) {
						styles.push("shape=diamond");
				}
				var content = passage.textContent;
				var firstTag = this.getFirstTag(passage);
				
				return this.parsePassage(name, styles, content, firstTag);
			},

	
			parsePassage: function(scrubbedTitleOrPid, styles, content, tag) {
				var result = [];
				var hue = 0;
				var parsedLinks = this.parseLinks(content, scrubbedTitleOrPid);
				this.links += parsedLinks.length;

				if (parsedLinks.length === 0)
					this.leaves++;

				if (styles.length === 0 && parsedLinks.length === 0) {
					//We are at a terminal passage that isn't already styled as the start or an end.
					styles.push("style=\"filled,diagonals\"");
				} else if (styles.length) {
					styles.push("style=\"filled,bold\"");
				}	else if (!this.colorBW) {
					styles.push("style=filled");
				}
				
				if (this.colorByNode) {
					hue = Math.round(100 * (content.length / this.maxLength) / 3)/100;  //HSV red-to-green range
					styles.push("fillcolor=\"" + hue + ",0.66,0.85\"");
				} else if (this.colorByTag && tag) {
					var indx = this.tagList.indexOf(tag);
					if (indx > -1)
						hue = this.hueList[indx]; //HSV spread across tags
					styles.push("fillcolor=\"" + hue + ",0.25,0.85\"");
				}

				//Push the node, in case there are no links.
				result.push(scrubbedTitleOrPid);

				if (styles.length) {
					result.push(" [" + styles.join(' ') + "]");
				}
				result.push("\r\n", parsedLinks.join("\r\n"), "\r\n");
				
				return result.join('');
			},

			
			parsePassageName: function(passage,returnName) {
				//Sometimes used to get the real name (returnName), sometimes the pids.
				var name;
				if (this.showNodeNames || returnName) {
					name = passage.getAttribute("name") ? passage.getAttribute("name") : "Untitled Passage";
					name = this.scrub(name);
				} else {
					name = passage.getAttribute("pid") ? passage.getAttribute("pid") : this.scrub("Untitled Passage");
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
							linkGraph.push(titleOrPid + " -> " + (this.showNodeNames ? this.scrub(target) : this.getIdFromTarget(target)));
						}
					}
				}
				
				return linkGraph;
			},

			
			rotate: function() {
				this.rotation = (this.rotation + 1)%4;
				this.convert();
			},

			
			scale: function() {
				var svgElt = document.getElementsByTagName("svg")[0];
				svgElt.setAttribute("width","100%");
				svgElt.removeAttribute("height");
			},

			
			scrub: function(title) {
				if (title) { // dangerously scrubbing non-ascii characters for graphviz bug
					title = title.replace(/"/gm,"\\\"").replace(/[^\x00-\x7F]/g, "");
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
					this.storyTitle = "Untitled";
					this.startNode = 1;
				}

				this.leaves = 0;
				this.links = 0;
				this.tightEnds = 0;
				this.checkpoints = document.getElementById("checkpointsCheckbox") ? document.getElementById("checkpointsCheckbox").checked : false;
				this.cluster = document.getElementById("clusterCheckbox") ? document.getElementById("clusterCheckbox").checked : false;
				this.colorBW = document.getElementById("colorCheckbox0") ? document.getElementById("colorCheckbox0").checked : false;
				this.colorByNode = document.getElementById("colorCheckbox1") ? document.getElementById("colorCheckbox1").checked : false;
				this.colorByTag = document.getElementById("colorCheckbox2") ? document.getElementById("colorCheckbox2").checked : false;
				this.ends = document.getElementById("endsCheckbox") ? document.getElementById("endsCheckbox").checked : false;
				this.showNodeNames = document.getElementById("nodeCheckbox") ? document.getElementById("nodeCheckbox").checked : false;
				
				var tagObject = {};
				this.tagList = [];
				this.targetObject = {};
				var tagArray, firstTag, scrubbedTitle, scrubbedTitleOrPid;
				var passages = document.querySelectorAll("tw-passagedata");
				for (var p = 0; p < passages.length; p++) {
					if (passages[p].innerText.length > this.maxLength)
						this.maxLength = passages[p].innerText.length;
					if (this.ends) {
						if (this.hasTag(passages[p],this.endTag))
							this.tightEnds++;
					}

					scrubbedTitle = this.parsePassageName(passages[p],true);
					scrubbedTitleOrPid = this.parsePassageName(passages[p]);
					if (passages[p].pid == this.startNode)
						this.startNodeName = scrubbedTitleOrPid;
					
					firstTag = this.getFirstTag(passages[p]);
					if (firstTag) {
						if (!tagObject.hasOwnProperty(firstTag)) {
							tagObject[firstTag] = [];
							this.tagList.push(firstTag);
						}
						tagObject[firstTag].push(scrubbedTitleOrPid);
					}

					this.targetObject[scrubbedTitle] = passages[p].getAttribute("pid");
				}

				this.hueList = [0];
				if (this.tagList.length) {
					for (var t=0; t<this.tagList.length; t++) {
						this.hueList[t] = Math.round(100 * t * 1/(this.tagList.length))/100;
					}
				}
				
				this.clusters = ""; //For repeated presses of the button.
				var clusterIndex = 0;
				for (var tag in tagObject) {
					if (tagObject.hasOwnProperty(tag)) {
						this.clusters += "subgraph cluster_" + clusterIndex + " {\r\n";
						this.clusters += "label=" + this.scrub(tag) + "\r\n";
						this.clusters += "style=\"rounded, filled\" fillcolor=\"ivory\"\r\n";
						this.clusters += tagObject[tag].join(" \r\n") + "}\r\n\r\n";
						clusterIndex++;
					}
				}
			},


			tagKey: function() {
				var tagKey = "{rank=source\r\nstyle=\"rounded, filled\"\r\n";
				var tagName;
				for (var t=0; t<this.tagList.length; t++) {
					tagName = this.scrub(this.tagList[t]);
					tagKey += tagName + " [shape=rect ";
					tagKey += "style=\"filled,rounded\" fillcolor=\"" + this.hueList[t] + ",0.25,0.85\"]\r\n";
				}
				tagKey += "}\r\n";
				
				var startName = (this.showNodeNames ? this.startNodeName : this.startNode);
				for (t=0; t<this.tagList.length; t++)
					tagKey += this.scrub(this.tagList[t]) + " -> " + startName + " [style=invis]\r\n";

				return tagKey;
			}
		};		
	};

	window.DotGraph.convert();

};
