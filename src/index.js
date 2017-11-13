var filesaver = require("filesaver.js-npm");
var _ = require("underscore");
var dotGraph = {};

(function(context) { 

	var config = {checkpoint: true,
								checkpointTag: "checkpoint",
								cluster: false,
								colorBW: true,
								colorByNode: true,
								colorByTag: false,
								display: true,
								ends: true,
								endTag: "End",
								lastTag: false,
								omitSpecialPassages: true,
								omitTags: [],
								renumber: false,
								rotation: "TB",
								scale: true,
								showNodeNames: false,
								palette: ["#FEAF16", "#2ED9FF", "#DEA0FD", "#FE00FA", "#F7E1A0",
													"#16FF32", "#3283FE", "#1C8356", "#FBE426", "#FA0087",
													"#F8A19F", "#1CBE4F", "#C4451C", "#C075A6", "#90AD1C", 
													"#B00068", "#AA0DFE", "#FC1CBF", "#1CFFCE", "#F6222E", 
													"#85660D", "#325A9B", "#B10DA1", "#A0A0A0", "#782AB6",
													"#565656"]
								};

	var specialPassageList = ["StoryTitle", "StoryIncludes",
														"StoryAuthor", "StorySubtitle", "StoryMenu", "StorySettings",
														"StoryColophon",
														"StoryBanner", "StoryCaption", "StoryInit", "StoryShare", 
														"PassageDone", "PassageFooter", "PassageHeader", "PassageReady",
														"MenuOptions", "MenuShare"];

	var storyObj = {title: "Untitled", 
									startNode: 1, 
									startNodeName: "Start", 
									leaves: 0,
									links: 0,
									tightEnds: 0,
									avLength: 1,
									maxLength: 1,
									passages: [],
									reachable: [],
									tags: [],
									tagObject: [],
									targets: {},
									twineVersion: 0
								 };

//graph
//init
//passage
//settings
//story
 
context.graph = (function() {

	return {
		convert: convert,
		edit: edit,
		saveDot: saveDot,
		saveSvg: saveSvg
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
		context.settings.scale();
	}
			
	function edit() {
		//The user can edit the dot graph and rerender it; 
		//in that case, read the dot file from the browser and render it.
		var editedOutput = document.getElementById("dotfile").value;

		//Needs error handling?
		document.getElementById("graph").innerHTML = Viz(editedOutput,"svg");
		context.settings.scale();
	}

	function saveDot() {
		var output = document.getElementById("dotfile").value;
		var blob = new Blob([output], {type: "text/plain;charset=utf-8"});
		filesaver.saveAs(blob, "dot" + Date.now() + ".txt", true);
 	}

	function saveSvg() {
		//Having trouble reading the existing svg off the page, so regenerate it.
		var output = document.getElementById("dotfile").value;
		var preblob = Viz(output,"svg").replace("no","yes");
		var blob = new Blob([preblob], {type: "image/svg+xml;charset=utf-8"});
		filesaver.saveAs(blob, "dotgraph" + Date.now() + ".svg", true);
 	}

	//Private
	function dot() {
		//(Re)parse the story and return the dot graph source.
		var buffer = [];

		//A change in the settings is what normally triggers regraphing.
		context.settings.parse();
		context.story.parse();

		buffer.push("digraph " + scrub(storyObj.title) + " {");
		buffer.push("rankdir=" + config.rotation + "\r\n");
		
		if (config.cluster) {
			buffer = buffer.concat(writeClusters(storyObj.tagObject));
		} else if (config.colorByTag) {
			buffer = buffer.concat(writeTagKey(storyObj,config));
		}
		
		//The main part of the graph is the passage graphing, including links.
		buffer = buffer.concat(passages());

		//Push title.
		buffer.push("\nlabelloc=\"t\"\n");
		buffer.push("label=" + scrub(storyObj.title));
		
		buffer.push("\n}");
		
		return buffer.join("\r\n");
	}

	function getPidFromTarget(target) {
		if (storyObj.targets.hasOwnProperty(target))
			return storyObj.targets[target];
		else
			return scrub(target);
	}	

	function graphLinks(passage, nameOrPid) {
		var linkGraph = [];

		for (var l = 0; l < passage.links.length; l++) {
			var target = passage.links[l][0];
			var linkForGraph = nameOrPid + " -> " + (config.showNodeNames ? scrub(target) : getPidFromTarget(target));
			if (passage.links[l][1])
				linkForGraph += " [style = dashed]";
			linkGraph.push(linkForGraph);
		}
		return linkGraph;
	}

	function getNameOrPid(passage, reversed) {
		//Used to get the node label in the style requested by the settings, 
		//except in tooltips, where we give the alternate label.
		var name;
		var returnAsName = (reversed ? !config.showNodeNames : config.showNodeNames);

		if (returnAsName) {
			name = scrub(passage.name);
		} else {
			name = passage.pid ? passage.pid : scrub("Untitled Passage");
		}
		return name;
	}

	function getNameOrPidFromTarget(target) {
		//Sometimes used to get the real name (returnName), sometimes the pids.
		var name;
		if (config.showNodeNames) {
			name = scrub(target);
		} else {
			name = getPidFromTarget(target);
		}
		return name;
	}

	function passages() {
		//Graph passages.
		var subbuffer = [];

		if (config.renumber && !config.showNodeNames) {
			//Renumbering is complicated.  Start at start.
			var i;
			for (i = 0; i < storyObj.passages.length; ++i) {
				if (storyObj.passages[i].pid == storyObj.startNode)
					subbuffer = subbuffer.concat(passage(storyObj.passages[i],1));
			}
			var renumberPid = 2;
			for (i = 0; i < storyObj.passages.length; ++i) {
				var psgi = storyObj.passages[i];
				if (psgi.pid != storyObj.startNode && !(config.omitSpecialPassages && psgi.special) && !psgi.omit) {
					subbuffer = subbuffer.concat(passage(psgi,renumberPid));
					renumberPid++;
				}
			}
		} else {
			for (i = 0; i < storyObj.passages.length; ++i) {
				if (!storyObj.passages[i].omit)
					subbuffer = subbuffer.concat(passage(storyObj.passages[i]));
			}
		}

		return subbuffer;
	}

	function passage(passage,label) {
		//Graph a single parsed passage, including links.
		var result = [];

		if ((config.omitSpecialPassages && passage.special) || passage.omit)
			return result;

		var scrubbedNameOrPid = getNameOrPid(passage);
		var styles = stylePassage(passage, label);

		var links = graphLinks(passage, scrubbedNameOrPid);
		
		//Push the node itself with styles (because it's always styled in some way).
		result.push("\r\n" + scrubbedNameOrPid + " [" + styles.join(' ') + "]");

		//Push the link list.
		result = result.concat(links);

		return result;
	}

	function stylePassage(passage, label) {
		var styles = [];

		var hue = 0;
		var pid = passage.pid;
		var content = passage.content;
		var tag = passage.theTag;

		//Start with any special shape for the passage.
		if (pid == storyObj.startNode || _.find(storyObj.unreachable, function(str){return str == passage.name;})) {
			styles.push("shape=doublecircle");
		} else if (config.ends && context.passage.hasTag(passage, config.endTag)) {
			styles.push("shape=egg");
		} else if (config.checkpoints && context.passage.hasTag(passage, config.checkpointTag)) {
			styles.push("shape=diamond");
		}

		//Add fill and bold styles.
		if (styles.length === 0 && passage.links.length === 0  && config.ends) {
			//We are at a terminal passage that isn't already styled as the start or an end.
			styles.push("style=\"filled,diagonals\"");
		} else if (styles.length) {
			styles.push("style=\"filled,bold\"");
		}	else if (!config.colorBW) {
			styles.push("style=filled");
		}
		
		//Calculate color.
		if (config.colorByNode) {
			hue = Math.round(100 * (Math.min(1.75, passage.textLength / storyObj.avLength)) / 3)/100;  //HSV red-to-green range
			styles.push("fillcolor=\"" + hue + ",0.66,0.85\"");
		} else if (config.colorByTag && tag) {
			var indx = storyObj.tags.indexOf(tag);
			if (indx > -1)
				hue = config.palette[indx%26]; //color alphabet colors
			styles.push("fillcolor=\"" + hue + "\"");
		}

		//Rename the node if a label was passed in.
		if (label)
			styles.push("label=\"" + label + "\"");
		
		//Add a tooltip.
		styles.push("tooltip=" + getNameOrPid(passage, true));
		return styles;
	}

	function scrub(name) {
		//Put names into a legal dot format.
		if (name) {
			// dangerously scrubbing non-ascii characters for graphviz bug
			name = name.replace(/"/gm,"\\\"").replace(/[^\x00-\x7F]/g, "");
			// add literal quotes for names in all cases.
			name = '"' + name + '"';
		}
		return name;
	}

	function writeClusters(tagObject) {
		var clusters = [];
		var clusterIndex = 0;
		for (var tag in tagObject) {
			if (tagObject.hasOwnProperty(tag) && !context.settings.isOmittedTag(tag)) {
				clusters.push("subgraph cluster_" + clusterIndex + " {");
				clusters.push("label=" + scrub(tag));
				clusters.push("style=\"rounded, filled\" fillcolor=\"ivory\"");
				clusters.push(tagObject[tag].map(getNameOrPidFromTarget).join(" \r\n"));
				clusters.push("}\r\n");
				clusterIndex++;
			}
		}
		return clusters;
	}
	
	function writeTagKey(story,settings) {
		var tagKey = ["{rank=source\r\nstyle=\"rounded, filled\""];
		var tagName;
		for (var t=0; t<story.tags.length; t++) {
			if (!context.settings.isOmittedTag(storyObj.tags[t])) {
				tagName = scrub(storyObj.tags[t]);
				tagKey.push(tagName + " [shape=rect style=\"filled,rounded\" fillcolor=\"" + settings.palette[t%26] + "\"]");
			}
		}
		tagKey.push("}");
		
		var startName = (settings.showNodeNames ? scrub(story.startNodeName) : story.startNode);

		//Dot hackery: invisible graphing to keep things lined up.
		for (t=0; t<story.tags.length; t++) {
			if (!context.settings.isOmittedTag(story.tags[t]))
				tagKey.push(scrub(story.tags[t]) + " -> " + startName + " [style=invis]");
		}
		return tagKey;
	}
	
})();

context.init = (function() {

	return {
		load: load
	};

	function load() {
		//Onload function.
		activateForm();
		context.graph.convert();
	}

	//Private.
	function activateForm() {
		document.getElementById("settingsForm").addEventListener('click', context.graph.convert, false);
		document.getElementById("omitTags").addEventListener('change', context.graph.convert, false);

		document.getElementById("editButton").addEventListener('click', context.graph.edit, false);
		document.getElementById("saveDotButton").addEventListener('click', context.graph.saveDot, false);
		document.getElementById("saveSvgButton").addEventListener('click', context.graph.saveSvg, false);
	}

})();

context.passage = (function() {

	return {
		hasTag: hasTag,
		parse: parse
	};

	function hasTag(passage, tag) {
		if (passage.tagArray.indexOf(tag) > -1)
			return true;
		else
			return false;
	}

	function parse(source, index) {
		//Parse passage from twine1 or 2 source.
		var passageObj = {};
		var tagArray = (source.getAttribute("tags") ? source.getAttribute("tags").trim().split(" ") : []);
		var links = parseLinks(source.innerText);

		passageObj.content = source.innerText;
		passageObj.links = links;
		passageObj.leaf = (links.length === 0);
		passageObj.textLength = source.innerText.length;
		//Make it like Twine2.
		passageObj.pid = source.getAttribute("pid") ? source.getAttribute("pid") : index;
		passageObj.tagArray = tagArray;
		passageObj.theTag = getTheTag(tagArray);
		passageObj.name = source.getAttribute("name") ? source.getAttribute("name") : (source.getAttribute("tiddler") ? source.getAttribute("tiddler") : "Untitled Passage");
		passageObj.special = (specialPassageList.indexOf(passageObj.name) > -1);
		passageObj.omit = hasOmittedTag(passageObj);

		return passageObj;
	}

	//Private	
	function getTheTag(tags) {
		var tagArray = tags.slice(0);
		if (config.ends && tagArray.indexOf(config.endTag) > -1) {
			tagArray.splice(tagArray.indexOf(config.endTag), 1);
		}
		if (config.checkpoints && tagArray.indexOf(config.checkpointTag) > -1)
			tagArray.splice(tagArray.indexOf(config.checkpointTag), 1);
		if (tagArray.length && config.lastTag) 
			return tagArray[tagArray.length - 1];
		else if (tagArray.length)
			return tagArray[0];
		else
			return "";
	}

	function hasOmittedTag(passage) {
		if (config.omitTags.length == 0) 
			return false;
		else {
			for (var t=0; t<config.omitTags.length; t++) {
				if (hasTag(passage,config.omitTags[t]))
					return true;
			}
			return false;
		}
	}

	function parseLink(target, type) {
		//Parsing code for the various formats, adapted from Snowman.
		
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
		return [target,type];
	}

	function parseLinks(content) {
		var linkList = [];
		var re = /\[\[(.*?)\]\]/g;
		var re2 = /\<\<display \"(.*?)\"\>\>/g;
		var targetArray;
		if (content) {
			//Clean up the content a bit (snowman), then extract links.
			// Remove /* comments */
			content = content.replace(/\/\*.*\*\//g, '');
			// Remove (starting) // comments
			content = content.replace(/^\/\/.*(\r\n?|\n)/g, '');
			
			while ((targetArray = re.exec(content)) !== null) {
				var target = parseLink(targetArray[1],0);
				if (/^\w+:\/\/\/?\w/i.test(target)) {
					// do nothing with external links
				}	else {
					linkList.push(target);
				}
			}
			if (config.display) {
				while ((targetArray = re2.exec(content)) !== null) {
					var target2 = parseLink(targetArray[1],1);
					if (/^\w+:\/\/\/?\w/i.test(target2)) {
						// do nothing with external links
					}	else {
						linkList.push(target2);
					}
				}
			}
		}
		return linkList;
	}

})();

context.settings = (function () {

	return {
		isOmittedTag: isOmittedTag,
		parse: parse,
		scale: scale
	};

	function isOmittedTag(tag) {
		if (config.omitTags.length == 0) 
			return false;
		else {
			for (var t=0; t<config.omitTags.length; t++) {
				if (config.omitTags[t] == tag)
					return true;
			}
			return false;
		}
	}

	function parse() {
		config.checkpoints = document.getElementById("checkpointsCheckbox") ? document.getElementById("checkpointsCheckbox").checked : false;
		config.cluster = document.getElementById("clusterCheckbox") ? document.getElementById("clusterCheckbox").checked : false;
		config.colorBW = document.getElementById("colorCheckbox0") ? document.getElementById("colorCheckbox0").checked : false;
		config.colorByNode = document.getElementById("colorCheckbox1") ? document.getElementById("colorCheckbox1").checked : false;
		config.colorByTag = document.getElementById("colorCheckbox2") ? document.getElementById("colorCheckbox2").checked : false;
		config.display = document.getElementById("displayCheckbox") ? document.getElementById("displayCheckbox").checked : true;
		config.ends = document.getElementById("endsCheckbox") ? document.getElementById("endsCheckbox").checked : false;
		config.omitSpecialPassages = document.getElementById("specialCheckbox") ? document.getElementById("specialCheckbox").checked : false;
		config.renumber = document.getElementById("renumberCheckbox") ? document.getElementById("renumberCheckbox").checked : false;
		config.rotation = document.querySelector("input[name='rotateCheckbox']:checked") ? document.querySelector("input[name='rotateCheckbox']:checked").value : "TB";
		config.scale = document.getElementById("scaleCheckbox") ? document.getElementById("scaleCheckbox").checked : true;
		config.showNodeNames = document.getElementById("nodeCheckbox0") ? document.getElementById("nodeCheckbox0").checked : false;
		config.omitTags = document.getElementById("omitTags") ? splitAndTrim(document.getElementById("omitTags").value) : [];
		config.lastTag = document.getElementById("lastTagCheckbox") ? document.getElementById("lastTagCheckbox").checked : false;
	}
			
	function scale() {
		if (config.scale) {
			var svgElt = document.getElementsByTagName("svg")[0];
			svgElt.setAttribute("width","100%");
			svgElt.removeAttribute("height");
		}
	}

	function splitAndTrim(tagList) {
		var tagArray = tagList.trim().split(",");
		var tagArrayTrimmed = [];
		for (var i = 0; i<tagArray.length; i++) {
			var tagTrimmed = tagArray[i].trim(); 
			if (tagTrimmed != "")
				tagArrayTrimmed.push(tagTrimmed);
		}

		document.getElementById("omitTagsFakeRadioButton").checked = (tagArrayTrimmed.length > 0);		
		return tagArrayTrimmed;
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
		var storyTwine2 = window.document.getElementsByTagName("tw-storydata")[0];

		if (storyTwine1) {
			storyObj.twineVersion = 1;
			var title = "Untitled Story";
			if (storyTwine1.querySelectorAll('[tiddler="StoryTitle"]').length) {
				title = storyTwine1.querySelectorAll('[tiddler="StoryTitle"]')[0].innerText;
			}
			storyObj.title = title;
		} else if (storyTwine2) {
			storyObj.twineVersion = 2;
			storyObj.title = storyTwine2.getAttribute("name") ? storyTwine2.getAttribute("name") : "Untitled";
			storyObj.startNode = storyTwine2.getAttribute("startnode") ? storyTwine2.getAttribute("startnode") : 1;
		} else {
			//Not clear this can occur.
			storyObj.title = 1;
			storyObj.startNode = 1;
		}

		if (storyTwine1)
			source = storyTwine1.querySelectorAll("div[tiddler]");
		else 
			source = document.querySelectorAll("tw-passagedata");

		storyObj.passages = parsePassages(source);
		storyObj.leaves = 0;
		storyObj.links = 0;
		storyObj.tightEnds = 0;

		storyObj.tagObject = {};
		storyObj.tags = [];
		storyObj.targets = {};
		storyObj.reachable = storyObj.reachable.concat(specialPassageList);

		for (p = 0; p < storyObj.passages.length; p++) {

			var stopo = storyObj.passages[p];

			if (storyTwine1 && stopo.name == "Start") {
				//Couldn't do this until source was cleaned.
				storyObj.startNode = p;
			}

			if (config.ends) {
				if (context.passage.hasTag(stopo,config.endTag))
					storyObj.tightEnds++;
			}
			
			if (stopo.pid == storyObj.startNode) {
				storyObj.startNodeName = stopo.name;
				storyObj.reachable.push(stopo.name);
			}
			
			if (stopo.theTag) {
				if (!storyObj.tagObject.hasOwnProperty(stopo.theTag)) {
					storyObj.tagObject[stopo.theTag] = [];
					storyObj.tags.push(stopo.theTag);
				}
				storyObj.tagObject[stopo.theTag].push(stopo.name);
			}

			//Create targets key for lookups.
			storyObj.targets[stopo.name] = stopo.pid;

			storyObj.links += stopo.links.length;
			storyObj.reachable = storyObj.reachable.concat(_.map(stopo.links,_.first));
			if (stopo.leaf && !stopo.omit && !(stopo.special && config.omitSpecialPassages))
				storyObj.leaves++;

		};

		storyObj.reachable = _.uniq(storyObj.reachable); 
		storyObj.unreachable = _.difference(_.pluck(storyObj.passages,"name"),storyObj.reachable);
		storyObj.maxLength = storyObj.passages.reduce(function(acc,pasg) { return Math.max(acc,pasg.textLength); }, 1);
		storyObj.avLength = storyObj.passages.reduce(function(acc,pasg) { return acc + pasg.textLength; }, 0) / storyObj.passages.length;

		writeStats();
	}

	//Private
	function parsePassages(source) {
		var passages = [];
		for (var p = 0; p < source.length; p++) {
			passages[p] = context.passage.parse(source[p],p);
		}
		return passages;
	}

	function writeStats() {
		document.getElementById("nodeCount").innerHTML = storyObj.passages.length;
		if (config.omitSpecialPassages || config.omitTags.length > 0) {
			var omittedCount = storyObj.passages.reduce(function(count, item) {
				return count + ((( item.special && config.omitSpecialPassages ) || item.omit ) ? 1 : 0);
			}, 0);
			document.getElementById("omitCount").innerHTML = " (" + (storyObj.passages.length - omittedCount) + " included, " + omittedCount + " omitted, " + storyObj.unreachable.length + " unreachable)";	
		} 

		document.getElementById("leafCount").innerHTML = storyObj.leaves;
		if (config.ends) {
			var looseEnds = storyObj.leaves - storyObj.tightEnds;
			document.getElementById("looseCount").innerHTML = " (including " + (looseEnds > 0 ? looseEnds : 0) + " loose end" + (looseEnds != 1 ? "s" : "") + ")";
		} else {
			document.getElementById("looseCount").innerHTML = "";
		}

		document.getElementById("linkCount").innerHTML = storyObj.links;
		document.getElementById("average").innerHTML = Math.round(100 * (storyObj.links / storyObj.passages.length))/100;

		document.getElementById("stats").setAttribute("title","Twine " + storyObj.twineVersion);
	}

})();
			
})(dotGraph);

window.onload = dotGraph.init.load();
