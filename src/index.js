var filesaver = require("filesaver.js-npm");
var dotGraph = {};

(function(context) { 

	var config = {checkpoint: true,
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
													"#85660D", "#325A9B", "#B10DA1", "#A0A0A0", "#782AB6",
													"#565656"]
								};

	var storyObj = {title: "Untitled", 
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
								 };
 
context.graph = (function() {

	return {
		convert: convert,
		edit: edit,
		saveDot: saveDot,
		saveSvg: saveSvg,
		scrub: scrub
	};

	function convert() {
		//Get the dot graph source.
		var output = dot();
		
		//Write the dot graph text to the page.
		var dotTextarea = document.getElementById("dotfile");
		dotTextarea.value = output;
		dotTextarea.style.height = dotTextarea.scrollHeight+'px'; 
		
		//Do the conversion and write the svg to the page.
		document.getElementById("graph").innerHTML = Viz(output,"svg");
		
	}
			
	function edit() {
		//The user can edit the dot graph and rerender it.
		var editedOutput = document.getElementById("dotfile").value;
		document.getElementById("graph").innerHTML = Viz(editedOutput,"svg");
	}

	function saveDot() {
		var output = document.getElementById("dotfile").value;
		var blob = new Blob([output], {type: "text/plain;charset=utf-8"});
		filesaver.saveAs(blob, "dot" + Date.now() + ".txt", true);
 	}

	function saveSvg() {
		var output = document.getElementById("dotfile").value;
		//Having trouble reading this off the page, so regenerate it.
		var preblob = Viz(output,"svg").replace("no","yes");
		var blob = new Blob([preblob], {type: "image/svg+xml;charset=utf-8"});
		filesaver.saveAs(blob, "dotgraph" + Date.now() + ".svg", true);
 	}

	//Private
	function dot() {
		//Parse the story and return the dot graph source.
		var buffer = [];
		var rotations = ["TB","LR","BT","RL"];
		context.settings.parse();

		//Only reparse if necessary.  
		//(Needs checks on certain settings changes to work as is, 
		//   or to separate parsing from presentation.)
		//if (storyObj.passages.length == 0)
		context.story.parse();

		buffer.push("digraph " + storyObj.title + " {\r\n");
		buffer.push("rankdir=" + rotations[config.rotation] + "\r\n\r\n");
		
		if (config.cluster)
			buffer.push(writeClusterCode(storyObj.tagObject));
		else if (config.colorByTag) {
			buffer.push(writeTagKey(storyObj,config));
		}
		
		document.getElementById("nodeCount").innerHTML = storyObj.passages.length;
		
		for (var i = 0; i < storyObj.passages.length; ++i) {
			buffer.push(context.passage.parse(storyObj.passages[i]));
		}
		
		//Push title.
		buffer.push("\nlabelloc=\"t\"\n");
		buffer.push("label=" + storyObj.title);
		
		buffer.push("\n}\r\n");
		
		document.getElementById("nodeCount").innerHTML = storyObj.passages.length;
		document.getElementById("leafCount").innerHTML = storyObj.leaves;
				document.getElementById("linkCount").innerHTML = storyObj.links;
		if (config.ends) {
			var looseEnds = storyObj.leaves - storyObj.tightEnds;
			document.getElementById("looseCount").innerHTML = " (including " + looseEnds + " loose end" + (looseEnds != 1 ? "s" : "") + ")";
		} else {
			document.getElementById("looseCount").innerHTML = "";
		}
		document.getElementById("average").innerHTML = Math.round(100 * (storyObj.links / storyObj.passages.length))/100;
		
		return buffer.join('');
	}

	function scrub(title) {
		if (title) {
			// dangerously scrubbing non-ascii characters for graphviz bug
			title = title.replace(/"/gm,"\\\"").replace(/[^\x00-\x7F]/g, "");
			// add literal quotes for titles in all cases.
			title = '"' + title + '"';
		}
		return title;
	}

	function writeClusterCode(tagObject) {
		var clusters = ""; //For repeated presses of the button.
		var clusterIndex = 0;
		for (var tag in tagObject) {
			if (tagObject.hasOwnProperty(tag)) {
				clusters += "subgraph cluster_" + clusterIndex + " {\r\n";
				clusters += "label=" + scrub(tag) + "\r\n";
				clusters += "style=\"rounded, filled\" fillcolor=\"ivory\"\r\n";
				clusters += tagObject[tag].join(" \r\n") + "}\r\n\r\n";
				clusterIndex++;
			}
		}
		return clusters;
	}
	
	function writeTagKey(story,settings) {
		var tagKey = "{rank=source\r\nstyle=\"rounded, filled\"\r\n";
		var tagName;
		for (var t=0; t<story.tags.length; t++) {
			tagName = scrub(storyObj.tags[t]);
			tagKey += tagName + " [shape=rect ";
			tagKey += "style=\"filled,rounded\" fillcolor=\"" + settings.palette[t%26] + "\"]\r\n";
		}
		tagKey += "}\r\n";
		
		var startName = (settings.showNodeNames ? story.startNodeName : story.startNode);
		for (t=0; t<story.tags.length; t++)
			tagKey += scrub(story.tags[t]) + " -> " + startName + " [style=invis]\r\n";
		
		return tagKey;
	}
	
})();

context.init = (function() {

	return {
		load: load
	};

	function load() {
		//Onload function.
		activateButtons();
		context.graph.convert();
	}

	//Private.
	function activateButtons() {
		document.getElementById("editButton").addEventListener('click', context.graph.edit, false);
		document.getElementById("rerunButton").addEventListener('click', context.graph.convert, false);
		document.getElementById("rotateButton").addEventListener('click', context.settings.rotate, false);
		document.getElementById("saveDotButton").addEventListener('click', context.graph.saveDot, false);
		document.getElementById("saveSvgButton").addEventListener('click', context.graph.saveSvg, false);
		document.getElementById("scaleButton").addEventListener('click', context.settings.scale, false);
	}

})();

context.passage = (function() {

	return {
		hasTag: hasTag,
		getFirstTag: getFirstTag,
		parse: parse,
		parseName: parseName
	};

	function getFirstTag(passage) {
		var tagArray = passage.tagArray.slice(0);
		if (config.ends && tagArray.indexOf(config.endTag) > -1) {
			tagArray.splice(tagArray.indexOf(config.endTag), 1);
		}
		if (config.checkpoints && tagArray.indexOf(config.checkpointTag) > -1)
			tagArray.splice(tagArray.indexOf(config.checkpointTag), 1);
		if (tagArray.length)
			return tagArray[0];
		else
			return "";
	}

	function hasTag(passage, tag) {
		if (passage.tagArray.indexOf(tag) > -1)
			return true;
		else
			return false;
	}

	function parse(passage) {
		var name = passage.scrubbedTitleOrPid;
		var pid = passage.pid;
		var styles = [];
		
		if (pid == storyObj.startNode) {
			styles.push("shape=doublecircle");
		} else if (config.ends && hasTag(passage, config.endTag)) {
			styles.push("shape=egg");
		} else if (config.checkpoints && hasTag(passage, config.checkpointTag)) {
			styles.push("shape=diamond");
		}
		var content = passage.content;
		var firstTag = passage.firstTag;
		
		var scrubbedTitleOrPid = passage.scrubbedTitleOrPid;
		var tag = passage.firstTag;
		var result = [];
		var hue = 0;
		var parsedLinks = parseLinks(content, scrubbedTitleOrPid);
		storyObj.links += parsedLinks.length;

		if (parsedLinks.length === 0)
			storyObj.leaves++;
		
		if (styles.length === 0 && parsedLinks.length === 0) {
			//We are at a terminal passage that isn't already styled as the start or an end.
			styles.push("style=\"filled,diagonals\"");
		} else if (styles.length) {
			styles.push("style=\"filled,bold\"");
		}	else if (!config.colorBW) {
			styles.push("style=filled");
		}
		
		if (config.colorByNode) {
			hue = Math.round(100 * (Math.min(1.75, content.length / storyObj.avLength)) / 3)/100;  //HSV red-to-green range
			styles.push("fillcolor=\"" + hue + ",0.66,0.85\"");
		} else if (config.colorByTag && tag) {
			var indx = storyObj.tags.indexOf(tag);
			if (indx > -1)
				hue = config.palette[indx%26]; //color alphabet colors
			styles.push("fillcolor=\"" + hue + "\"");
		}
		
		//Push the node, in case there are no links.
		result.push(scrubbedTitleOrPid);
		styles.push("tooltip=" + passage.scrubbedTitle);
		
		result.push(" [" + styles.join(' ') + "]");
		result.push("\r\n", parsedLinks.join("\r\n"), "\r\n");
		
		return result.join('');
	}
			
	function parseName(passage,returnName) {
		//Sometimes used to get the real name (returnName), sometimes the pids.
		var name;
		if (config.showNodeNames || returnName) {
			name = context.graph.scrub(passage.name);
		} else {
			name = passage.pid ? passage.pid : context.graph.scrub("Untitled Passage");
		}
		return name;
	}

	//Private
	function getIdFromTarget(target) {
		var scrubbedTarget = context.graph.scrub(target);
		if (storyObj.targets.hasOwnProperty(scrubbedTarget))
			return storyObj.targets[scrubbedTarget];
		else
			return scrubbedTarget;
	}	
	
	function parseLink(target) {
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
	}

	function parseLinks(content, titleOrPid) {
		var linkGraph = [];
		var re = /\[\[(.*?)\]\]/g;
		var targetArray;
		if (content) {
			//Clean up the content a bit (snowman), then extract links.
			// Remove /* comments */
			content = content.replace(/\/\*.*\*\//g, '');
			// Remove (starting) // comments
			content = content.replace(/^\/\/.*(\r\n?|\n)/g, '');
			
			while ((targetArray = re.exec(content)) !== null) {
				var target = parseLink(targetArray[1]);
				if (/^\w+:\/\/\/?\w/i.test(target)) {
					// do nothing with external links
				}	else {
					linkGraph.push(titleOrPid + " -> " + (config.showNodeNames ? context.graph.scrub(target) : getIdFromTarget(target)));
				}
			}
		}
		return linkGraph;
	}

})();

context.settings = (function () {

	return {
		parse: parse,
		rotate: rotate,
		scale: scale
	};

	function parse() {
		config.checkpoints = document.getElementById("checkpointsCheckbox") ? document.getElementById("checkpointsCheckbox").checked : false;
		config.cluster = document.getElementById("clusterCheckbox") ? document.getElementById("clusterCheckbox").checked : false;
		config.colorBW = document.getElementById("colorCheckbox0") ? document.getElementById("colorCheckbox0").checked : false;
		config.colorByNode = document.getElementById("colorCheckbox1") ? document.getElementById("colorCheckbox1").checked : false;
		config.colorByTag = document.getElementById("colorCheckbox2") ? document.getElementById("colorCheckbox2").checked : false;
		config.ends = document.getElementById("endsCheckbox") ? document.getElementById("endsCheckbox").checked : false;
		config.showNodeNames = document.getElementById("nodeCheckbox") ? document.getElementById("nodeCheckbox").checked : false;
	}
			
	function rotate() {
		config.rotation = (config.rotation + 1)%4;
		context.graph.convert();
	}

	function scale() {
		var svgElt = document.getElementsByTagName("svg")[0];
		svgElt.setAttribute("width","100%");
		svgElt.removeAttribute("height");
	}

})();

context.story = (function () {

	return {
		parse: parse
	};

	function parse() {
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
			storyObj.title = context.graph.scrub(title);
			
			var specialPassageList = ["StoryAuthor","StorySubtitle","StoryMenu","StorySettings","StoryIncludes"];
			specialPassageList.forEach(function(specialPassage) {
				if (storyTwine1.querySelectorAll('[tiddler="' + specialPassage + '"]').length) {
					storyTwine1.removeChild(storyTwine1.querySelectorAll('[tiddler="' + specialPassage + '"]')[0]);
				}
			});
			
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
			storyObj.title = context.graph.scrub(storyData[0].getAttribute("name"));
			storyObj.startNode = storyData[0].getAttribute("startnode");
			source = document.querySelectorAll("tw-passagedata");
		} else {
			storyObj.title = "Untitled";
			storyObj.startNode = 1;
			source = document.querySelectorAll("tw-passagedata");
		}

		for (p = 0; p < source.length; p++) {
			if (storyTwine1 && source[p].getAttribute("tiddler") == "Start") {
				//Couldn't do this until source was cleaned.
				storyObj.startNode = p;
			}
			storyObj.passages[p] = {};
					storyObj.passages[p].content = source[p].innerText;
			storyObj.passages[p].textLength = storyObj.passages[p].content.length;
			//Make it like Twine2.
			storyObj.passages[p].pid = source[p].getAttribute("pid") ? source[p].getAttribute("pid") : p;
			storyObj.passages[p].tagArray = (source[p].getAttribute("tags") ? source[p].getAttribute("tags").split(" ") : []);
			storyObj.passages[p].name = source[p].getAttribute("name") ? source[p].getAttribute("name") :
				(source[p].getAttribute("tiddler") ? source[p].getAttribute("tiddler") : "Untitled Passage");
			storyObj.passages[p].scrubbedTitle = context.passage.parseName(storyObj.passages[p],true);
			storyObj.passages[p].scrubbedTitleOrPid = context.passage.parseName(storyObj.passages[p]);
		}
		
		storyObj.leaves = 0;
		storyObj.links = 0;
		storyObj.tightEnds = 0;
		
		storyObj.tagObject = {};
		storyObj.tags = [];
		storyObj.targets = {};
		for (p = 0; p < storyObj.passages.length; p++) {
			if (config.ends) {
				if (context.passage.hasTag(storyObj.passages[p],config.endTag))
					storyObj.tightEnds++;
			}
			
			if (storyObj.passages[p].pid == storyObj.startNode)
				storyObj.startNodeName = storyObj.passages[p].scrubbedTitleOrPid;
			
			storyObj.passages[p].firstTag = context.passage.getFirstTag(storyObj.passages[p]);
			if (storyObj.passages[p].firstTag) {
				if (!storyObj.tagObject.hasOwnProperty(storyObj.passages[p].firstTag)) {
					storyObj.tagObject[storyObj.passages[p].firstTag] = [];
					storyObj.tags.push(storyObj.passages[p].firstTag);
				}
				storyObj.tagObject[storyObj.passages[p].firstTag].push(storyObj.passages[p].scrubbedTitleOrPid);
			}
			
			storyObj.targets[storyObj.passages[p].scrubbedTitle] = storyObj.passages[p].pid;
		};
		
		storyObj.maxLength = storyObj.passages.reduce(function(acc,pasg) { return Math.max(acc,pasg.textLength); }, 1);
		storyObj.avLength = storyObj.passages.reduce(function(acc,pasg) { return acc + pasg.textLength; }, 0) / storyObj.passages.length;
		
	}

})();
			
})(dotGraph);

window.onload = dotGraph.init.load();
