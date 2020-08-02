var filesaver = require("filesaver.js-npm");
var _ = require("underscore");
var dotGraph = {};

(function(context) {

	var corsProxy = "https://cors-anywhere.herokuapp.com/"; //is being blocked by t.co and tads.org, unfortunately.
	var ttCorsProxy = "https://mcdemarco.net/games/bgg/proxy.php?csurl="; //only permits t.co, tads.org, and similar.

	var config = {checkpoint: true,
								checkpointTag: "checkpoint",
								cluster: false,
								clusterTags: [],
								color: "length",
								countWords: true,
								display: true,
								dotExtension: "gv",
								ends: true,
								endTag: "end",
								engine: "dot",
								hideDot: false,
								hideJSON: false,
								hideGML: true,
								hideGraphML: true,
								hideSettings: false,
								increment: 0.2,
								lastTag: false,
								omitSpecialPassages: true,
								omitSpecialTags: true,
								omitTags: [],
								prefix: "",
								postfix: "",
								renumber: false,
								rotation: "TB",
								scale: "100%",
								showNodeNames: false,
								snowstick: false,
								snowstickObj: {},
								tooltips: true,
								trace: "",
								palette: ["#FEAF16", "#2ED9FF", "#DEA0FD", "#FE00FA", "#F7E1A0",
													"#16FF32", "#3283FE", "#1C8356", "#FBE426", "#FA0087",
													"#F8A19F", "#1CBE4F", "#C4451C", "#C075A6", "#90AD1C", 
													"#B00068", "#AA0DFE", "#FC1CBF", "#1CFFCE", "#F6222E", 
													"#85660D", "#325A9B", "#B10DA1", "#A0A0A0", "#782AB6",
													"#565656"],
								paletteExceptions: {
									start: "#C8C8C8",
									ends: "#C8C8C8",
									unreachable: "#FF6666",
									untagged: "#FFFFFF",
									trace: "#FF8000",
									default: "#FFFFFF",
									leafHue: 0.30,
									readHue: 0.22
								}
							 };

	var specialPassageList = ["StoryTitle", "StoryIncludes", "StoryData",
														"StoryAuthor", "StorySubtitle", "StoryMenu", "StorySettings",
														"StoryColophon",
														"StoryBanner", "StoryCaption", "StoryInit", "StoryShare", 
														"PassageDone", "PassageFooter", "PassageHeader", "PassageReady",
														"MenuOptions", "MenuShare", "DotGraphSettings"];

	var specialTagList = ["annotation", "debug-footer", "debug-header", "debug-startup", 
												"footer", "haml", "header", "script", "startup", "stylesheet", 
												"twee2", "transition", "Twine.private", "widget"];

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

	var viz = new Viz();

//dot
//json
//gml
//graphml
//graph
//init
//passage
//settings
//story

context.dot = (function() {

	return {
		convert: convert
	};

	function convert() {
		//Return the dot graph source.
		var buffer = [];

		buffer.push("digraph " + scrub(storyObj.title) + " {");
		buffer.push("rankdir=" + config.rotation + "\r\n");
		
		if (config.cluster) {
			buffer = buffer.concat(writeClusters(storyObj.tagObject));
		}
		if (config.color == "tag" && storyObj.tags.length != config.clusterTags.length) {
			buffer = buffer.concat(writeTagKey(storyObj,config));
		}
		
		//The main part of the graph is the passage graphing, including links.
		buffer = buffer.concat(passages());

		//Push title.
		buffer.push("\r\nlabelloc=\"t\"\r\n");
		buffer.push("label=" + scrub(storyObj.title));
		
		buffer.push("\r\n}");
		
		return buffer.join("\r\n");
	}

	//private

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

	function getNameOrPid(passage, reversed, withCount, withAffix) {
		//Used to get the node label in the style requested by the settings, 
		//except in tooltips, where we give the alternate label and a word count.
		var name;
		var returnAsName = (reversed ? !config.showNodeNames : config.showNodeNames);

		if (returnAsName) {
			name = passage.name;
		} else {
			name = passage.pid ? passage.pid : "Untitled Passage";
		}
		if (withCount && config.countWords)
			name += " (" + passage.wordCount + " word" + (passage.wordCount == 1 ? "" : "s") + ")";
		if (withAffix)
			name = config.prefix + name + config.postfix;
		return scrub(name);
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

	function makeHSV(hue, sat, val) {
		return hue.toFixed(2) + "," + sat.toFixed(2) + "," + val.toFixed(2);
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
		//Push the node itself and the styles (because it's always styled in some way).
		result.push("\r\n" + scrubbedNameOrPid + " [" + styles.join(' ') + "]");
		
		//Push the link list.
		result = result.concat(links);

		return result;
	}

	function stylePassage(passage, label) {
		var styles = [];

		var hue = 0;
		var sat = 0;
		var val = 1;
		var pid = passage.pid;
		var content = passage.content;
		var tag = passage.theTag;

		//Start with any special shape for the passage.
		if (config.snowstick && passage.ssBookmark) {
			styles.push("shape=note");
		} else if (passage.trace) {
			styles.push("shape=hexagon");
		} else if (pid == storyObj.startNode || _.find(storyObj.unreachable, function(str){return str == passage.name;})) {
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
		}	else if (config.color != "bw") {
			styles.push("style=filled");
		}
		
		//Calculate color.
		if (config.color == "length") {
			//Graphviz supports HSV, so use it to create a red-to-blue/green range
			hue = Math.round(100 * (Math.min(1.75, passage.textLength / storyObj.avLength)) / 3)/100;  
			styles.push("fillcolor=\"" + hue + ",0.66,0.85\"");
		} else if (config.color == "tag" && tag) {
			var indx = storyObj.tags.indexOf(tag);
			if (indx > -1)
				hue = config.palette[indx%26]; //color alphabet colors
			styles.push("fillcolor=\"" + hue + "\"");
			styles.push("fontcolor=\"" + config.paletteContrastColors[indx%26] + "\"");
		} else if (config.color == "tag") {
			//No fill for you!
 		} else if (config.snowstick && passage.ssLeaf && ((config.ends && context.passage.hasTag(passage, config.endTag)) || passage.leaf)) {
			//Solid real leaves for clarity.
			hue = config.paletteExceptions.leafHue;
			styles.push("fillcolor=\"" + makeHSV(hue,0.90,0.50) + "\"");
 		} else if (config.snowstick && passage.ssLeaf) {
			//ssLeaf has been set to a fraction representing how recently it was read (0 for unread).
			//Use it to vary both saturation and value.
			hue = config.paletteExceptions.leafHue;
			sat = passage.ssLeaf;
			val = Math.round(100 * passage.ssLeaf / 5) / 100 + 0.50;  //Darker value range.
			styles.push("fillcolor=\"" + makeHSV(hue,sat,val) + "\"");
 		} else if (passage.trace) {
			styles.push("fillcolor=\"" + config.paletteExceptions.trace + "\"");
 		} else if (config.snowstick && passage.ssRead) {
			//ssRead has been set to a fraction representing how recently it was read (0 for unread).
			//Use it to vary both saturation and value.
			hue = config.paletteExceptions.readHue;
			sat = passage.ssRead;
			val = Math.round(100 * passage.ssRead / 5) / 100 + 0.79;  //Lighter value range.
			styles.push("fillcolor=\"" + makeHSV(hue,sat,val) + "\"");
		} else if (pid == storyObj.startNode) {
			styles.push("fillcolor=\"" + config.paletteExceptions.start + "\"");
		} else if (config.ends && context.passage.hasTag(passage, config.endTag)) {
			styles.push("fillcolor=\"" + config.paletteExceptions.ends + "\"");
		} else if (_.find(storyObj.unreachable, function(str){return str == passage.name;})) {
			styles.push("fillcolor=\"" + config.paletteExceptions.unreachable + "\"");
 		} else if (config.color == "tag") {
			styles.push("fillcolor=\"" + config.paletteExceptions.untagged + "\"");
 		} else {
			styles.push("fillcolor=\"" + config.paletteExceptions.default + "\"");
		}

		//Rename the node if a label or prefix was passed in.
		if (label || config.prefix || config.postfix) {
			if (label)
				styles.push("label=\"" + config.prefix + label + config.postfix + "\"");
			else
				styles.push("label=" + getNameOrPid(passage, false, false, true));
		}
		
		//Add a tooltip.
		if (config.tooltips) {
			styles.push("tooltip=" + getNameOrPid(passage, true, true));
		}
		return styles;
	}

	function scrub(name) {
		//Put names into a legal dot format.
		if (name) {
			//New viz only needs the quote escaping.
			name = name.toString().replace(/"/gm,"\\\"");
			// add literal quotes for names in all cases.
			name = '"' + name + '"';
		}
		return name;
	}

	function writeClusters(tagObject) {
		var clusters = [];
		var clusterIndex = 0;
		for (var tag in tagObject) {
			if (tagObject.hasOwnProperty(tag) && !context.settings.isOmittedTag(tag) && (config.clusterTags.length == 0 || config.clusterTags.indexOf(tag) > -1)) {
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
				tagKey.push(tagName + " [shape=rect style=\"filled,rounded\" fillcolor=\"" + settings.palette[t%26] + "\" fontcolor=\"" + settings.paletteContrastColors[t%26] + "\"]");
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

context.gml = (function() {

	return {
		convert: convert
	};

	function convert() {
		//Return gml for the graph.
		var buffer = [];
		var ifid = context.settings.ifid().replace(/[A-F\-]/g, "").substr(0,6);

		buffer.push("graph [");
		buffer.push("directed 1");
		//The rather underspecified GML format appears to require integer IDs.
		buffer.push("id " + (ifid ? ifid : storyObj.passages.length + 1800));
		//Push title.
		buffer.push("label " + scrub(storyObj.title));

		if (config.cluster) {
			//no clustering in gml?
		}
		if (config.color == "tag" && storyObj.tags.length != config.clusterTags.length) {
			//no obvious way to write the tags, not that it was so obvious for dot either.
		}
		
		//The main part of the graph is the passage graphing, including links.
		var result = passages();
		buffer = buffer.concat(result.nodes.join(''));
		buffer = buffer.concat(result.edges.join('\r\n'));

		buffer.push("\r\n]");
		
		return buffer.join("\r\n\t");
	}

	//private

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
			var linkForGraph = ((passage.pid != storyObj.startNode || l > 0) ? "\t" : "") + 
					"edge [\r\n\t\t" + "source " + passage.pid + 
					"\r\n\t\t" + "target " + getPidFromTarget(target);
			if (passage.links[l][1])
				linkForGraph += " \r\n\t\t" + "label display";

			linkForGraph += "\r\n\t]";
			linkGraph.push(linkForGraph);
		}
		return linkGraph;
	}

	function getNameOrPid(passage, reversed, withCount, withAffix) {
		//Used to get the node label in the style requested by the settings, 
		//except in tooltips, where we give the alternate label and a word count.
		var name;
		var returnAsName = (reversed ? !config.showNodeNames : config.showNodeNames);

		if (returnAsName) {
			name = passage.name;
		} else {
			name = passage.pid ? passage.pid : "Untitled Passage";
		}
		if (withCount && config.countWords)
			name += " (" + passage.wordCount + " word" + (passage.wordCount == 1 ? "" : "s") + ")";
		if (withAffix)
			name = config.prefix + name + config.postfix;
		return scrub(name);
	}

	function passages() {
		//Graph passages.
		var subbuffer = {nodes: [],edges: []};

		var result;
		if (config.renumber && !config.showNodeNames) {
			//Renumbering is complicated.  Start at start.
			var i;
			for (i = 0; i < storyObj.passages.length; ++i) {
				if (storyObj.passages[i].pid == storyObj.startNode) {
					result = passage(storyObj.passages[i],1);
					subbuffer.nodes.concat(result.node);
					subbuffer.edges.concat(result.edges);
				}
			}
			var renumberPid = 2;
			for (i = 0; i < storyObj.passages.length; ++i) {
				var psgi = storyObj.passages[i];
				if (psgi.pid != storyObj.startNode && !(config.omitSpecialPassages && psgi.special) && !psgi.omit) {
					result = passage(psgi,renumberPid);
					subbuffer.nodes.concat(result.node);
					subbuffer.edges.concat(result.edges);
					renumberPid++;
				}
			}
		} else {
			for (i = 0; i < storyObj.passages.length; ++i) {
				if (!storyObj.passages[i].omit) {
					result = passage(storyObj.passages[i]);
					subbuffer.nodes = subbuffer.nodes.concat(result.node);
					subbuffer.edges = subbuffer.edges.concat(result.edges);
				}
			}
		}

		return subbuffer;
	}

	function passage(passage,label) {
		//Graph a single parsed passage, including links.
		//GML seems to have a hidden restriction on order, so return the nodes separate from the edges.
		var subbuffer = {node: [], edges: []};

		if ((config.omitSpecialPassages && passage.special) || passage.omit)
			return subbuffer;

		var scrubbedNameOrPid = getNameOrPid(passage);

		//Push the node itself and the styles (because it's always styled in some way).
		var nodeBuffer = [];
		if (passage.pid != storyObj.startNode)
			nodeBuffer.push("\t");
		nodeBuffer.push("node [");
		nodeBuffer.push("\t" + "id " +  passage.pid);
		nodeBuffer.push("\t" + "label " + scrubbedNameOrPid);
		//In theory you can push all the styles, but in practice they upset apps that read GML.
		nodeBuffer.push("]");
		
		subbuffer.node.push(nodeBuffer.join('\r\n\t'));

		//Push the link list.
		subbuffer.edges = graphLinks(passage, scrubbedNameOrPid);

		return subbuffer;
	}

	function scrub(name) {
		//Put names into a legal dot format.
		if (name) {
			//New viz only needs the quote escaping.
			name = name.toString().replace(/"/gm,"\\\"");
			// add literal quotes for names in all cases.
			name = '"' + name + '"';
		}
		return name;
	}

})();

context.json = (function() {

	return {
		convert: convert
	};

	function convert() {
		//Return json for the graph.

		//d3.js force-directed graph format is pretty lightweight, so save some info in a comment.
		var comment = [scrub(storyObj.title)];
		var ifid = context.settings.ifid();
		if (ifid)
			comment.push("IFID: " + ifid);

		if (config.cluster) {
			//no clustering in d3?
		}
		if (config.color == "tag" && storyObj.tags.length != config.clusterTags.length) {
			//no obvious way to write the tags, not that it was so obvious for dot either.
		}
		
		//The main part of the graph is the passage graphing, including links.
		var result = passages();

		return "/*\r\n" + comment.join("\r\n") + "\r\n*/\r\n" + JSON.stringify(result, null, '\t');
	}

	//private

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
			var linkForGraph = {
				source:  passage.pid,
				target: getPidFromTarget(target)
			}
			if (passage.links[l][1])
				linkForGraph.category = "display link";

			linkGraph.push(linkForGraph);
		}
		return linkGraph;
	}

	function getNameOrPid(passage, reversed, withCount, withAffix) {
		//Used to get the node label in the style requested by the settings, 
		//except in tooltips, where we give the alternate label and a word count.
		var name;
		var returnAsName = (reversed ? !config.showNodeNames : config.showNodeNames);

		if (returnAsName) {
			name = passage.name;
		} else {
			name = passage.pid ? passage.pid : "Untitled Passage";
		}
		if (withCount && config.countWords)
			name += " (" + passage.wordCount + " word" + (passage.wordCount == 1 ? "" : "s") + ")";
		if (withAffix)
			name = config.prefix + name + config.postfix;
		return scrub(name);
	}

	function makeHSV(hue, sat, val) {
		//Just reformats to a string.
		return hue.toFixed(2) + "," + sat.toFixed(2) + "," + val.toFixed(2);
	}

	function makeRGB(h, s, v) {
		//Converts HSV arguments to hexadecimal RGB format.
		//based on https://stackoverflow.com/a/17243070/4965965
    var r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    r = Math.round(r * 255).toString(16);
    g = Math.round(g * 255).toString(16);
    b = Math.round(b * 255).toString(16);
    return "#" + (r.length == 1 ? "0" : "") + r + (g.length == 1 ? "0" : "") + g + (b.length == 1 ? "0" : "") + b;
	}

	function passages() {
		//Graph passages.
		var subbuffer = {
			nodes: [],
			links: []
		};

		var result;
		if (config.renumber && !config.showNodeNames) {
			//Renumbering is complicated.  Start at start.
			var i;
			for (i = 0; i < storyObj.passages.length; ++i) {
				if (storyObj.passages[i].pid == storyObj.startNode) {
					result = passage(storyObj.passages[i],1);
					subbuffer.nodes.concat(result.node);
					subbuffer.links.concat(result.links);
				}
			}
			var renumberPid = 2;
			for (i = 0; i < storyObj.passages.length; ++i) {
				var psgi = storyObj.passages[i];
				if (psgi.pid != storyObj.startNode && !(config.omitSpecialPassages && psgi.special) && !psgi.omit) {
					result = passage(psgi,renumberPid);
					subbuffer.nodes.concat(result.node);
					subbuffer.links.concat(result.links);
					renumberPid++;
				}
			}
		} else {
			for (i = 0; i < storyObj.passages.length; ++i) {
				if (!storyObj.passages[i].omit) {
					result = passage(storyObj.passages[i]);
					subbuffer.nodes = subbuffer.nodes.concat(result.node);
					subbuffer.links = subbuffer.links.concat(result.links);
				}
			}
		}

		return subbuffer;
	}

	function passage(passage,label) {
		//Graph a single parsed passage, including links.
		//As with GML, return the nodes separate from the edges.

		var subbuffer = {node: [], links: []};

		if ((config.omitSpecialPassages && passage.special) || passage.omit)
			return subbuffer;

		var scrubbedNameOrPid = getNameOrPid(passage);
		var styles = stylePassage(passage,label);

		//Push the node itself and the styles (because it's always styled in some way).
		var node = {
			id:  passage.pid,
			name:  scrubbedNameOrPid
		}
/*		for (var key in styles) {
			if (styles.hasOwnProperty(key))
				node[key] = styles[key];
		}
*/
		subbuffer.node.push(node);

		//Push the link list.
		subbuffer.links = graphLinks(passage, scrubbedNameOrPid);

		return subbuffer;
	}

	function stylePassage(passage, label) {
		var styles = {contrastColor: "black"};

		var hue = 0;
		var sat = 0;
		var val = 1;
		var pid = passage.pid;
		var content = passage.content;
		var tag = passage.theTag;
		var color, contrastColor;

		//Start with any special shape for the passage.
		if (config.snowstick && passage.ssBookmark) {
			styles.shape = "TRAPEZ";
		} else if (passage.trace) {
			styles.shape = "HEXAGON";
		} else if (pid == storyObj.startNode || _.find(storyObj.unreachable, function(str){return str == passage.name;})) {
			styles.shape = "OCTAGON";
		} else if (config.ends && context.passage.hasTag(passage, config.endTag)) {
			styles.shape = "ROUND_RECTANGLE";
		} else if (config.checkpoints && context.passage.hasTag(passage, config.checkpointTag)) {
			styles.shape = "DIAMOND";
		} else {
			styles.shape = "ELLIPSE";
		}

		contrastColor = "BLACK";
		//Calculate color.  Omitted font colors for now but could use the stroke color?
		if (config.color == "length") {
			//Graphviz supported HSV, so used it to create a red-to-blue/green range
			hue = Math.round(100 * (Math.min(1.75, passage.textLength / storyObj.avLength)) / 3)/100;
			styles.color = makeRGB(hue,0.66,0.85);
		} else if (config.color == "tag" && tag) {
			var indx = storyObj.tags.indexOf(tag);
			if (indx > -1)
				hue = config.palette[indx%26]; //color alphabet colors
 			styles.color = hue;
			styles.contrastColor = config.paletteContrastColors[indx%26];
		} else if (config.color == "tag") {
			//No fill for you!
 		} else if (config.snowstick && passage.ssLeaf && ((config.ends && context.passage.hasTag(passage, config.endTag)) || passage.leaf)) {
			//Solid real leaves for clarity.
			hue = config.paletteExceptions.leafHue;
			styles.color = makeRGB(hue,0.90,0.50);
 		} else if (config.snowstick && passage.ssLeaf) {
			//ssLeaf has been set to a fraction representing how recently it was read (0 for unread).
			//Use it to vary both saturation and value.
			hue = config.paletteExceptions.leafHue;
			sat = passage.ssLeaf;
			val = Math.round(100 * passage.ssLeaf / 5) / 100 + 0.50;  //Darker value range.
			styles.color = makeRGB(hue,sat,val);
 		} else if (passage.trace) {
			styles.color = config.paletteExceptions.trace;
 		} else if (config.snowstick && passage.ssRead) {
			//ssRead has been set to a fraction representing how recently it was read (0 for unread).
			//Use it to vary both saturation and value.
			hue = config.paletteExceptions.readHue;
			sat = passage.ssRead;
			val = Math.round(100 * passage.ssRead / 5) / 100 + 0.79;  //Lighter value range.
			styles.color = makeRGB(hue,sat,val);
		} else if (pid == storyObj.startNode) {
			styles.color = config.paletteExceptions.start;
		} else if (config.ends && context.passage.hasTag(passage, config.endTag)) {
			styles.color = config.paletteExceptions.ends;
		} else if (_.find(storyObj.unreachable, function(str){return str == passage.name;})) {
			styles.color = config.paletteExceptions.unreachable;
 		} else if (config.color == "tag") {
			styles.color = config.paletteExceptions.untagged;
 		} else {
			styles.color = config.paletteExceptions.default;
		}

		if (label || config.prefix || config.postfix) {
			if (label)
				styles.label = config.prefix + label + config.postfix;
			else
				styles.label = getNameOrPid(passage, false, false, true);
		} else 
			styles.label = getNameOrPid(passage);

		return styles;
	}

	function scrub(name) {
		//JSON.stringify should handle any name issues.
		return name;
	}

})();

context.graphml = (function() {

	return {
		convert: convert
	};

	function convert() {
		//Return the dot graph source.
		var buffer = [];
		var ifid = context.settings.ifid();

		var header = '<?xml version="1.0" encoding="UTF-8"?>\r\n' + 
				'<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd" xmlns:y="http://www.yworks.com/xml/yfiles-common/3.0" xmlns:x="http://www.yworks.com/xml/yfiles-common/markup/3.0" xmlns:yjs="http://www.yworks.com/xml/yfiles-for-html/2.0/xaml">\r\n' + 
				'\t<key id="g4" for="node" attr.name="label"/>\r\n' + 
				'\t<key id="d4" for="node" attr.name="NodeLabels" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/NodeLabels"/>\r\n' + 
				'\t<key id="g7" for="node" attr.name="color"/>\r\n' + 
				'\t<key id="d7" for="node" attr.name="NodeStyle" y:attr.uri="http://www.yworks.com/xml/yfiles-common/2.0/NodeStyle"/>\r\n' + 
				'\t<graph id="' + (ifid ? ifid : storyObj.passages.length + 1800) + '" edgedefault="directed">\r\n\t\t';

		buffer.push('<desc>' + storyObj.title + '</desc>');

		/* also no way to cluster?
		if (config.cluster) {
			buffer = buffer.concat(writeClusters(storyObj.tagObject));
		}
		if (config.color == "tag" && storyObj.tags.length != config.clusterTags.length) {
			buffer = buffer.concat(writeTagKey(storyObj,config));
		}
		*/

		//The main part of the graph is the passage graphing, including links.
		buffer = buffer.concat(passages());

		var footer = '\r\n\t</graph>\r\n</graphml>\r\n';
		
		return header + buffer.join("\r\n\t\t") + footer;
	}

	//private

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
			var linkForGraph = '<edge source="' + passage.pid + '" target="' + getPidFromTarget(target) + '">';
			if (passage.links[l][1])
				linkForGraph += '<desc>display link</desc>';
			linkForGraph += '</edge>';
			linkGraph.push(linkForGraph);
		}
		return linkGraph;
	}

	function getNameOrPid(passage, reversed, withCount, withAffix) {
		//Used to get the node label in the style requested by the settings, 
		//except in tooltips, where we give the alternate label and a word count.
		var name;
		var returnAsName = (reversed ? !config.showNodeNames : config.showNodeNames);

		if (returnAsName) {
			name = passage.name;
		} else {
			name = passage.pid ? passage.pid : "Untitled Passage";
		}
		if (withCount && config.countWords)
			name += " (" + passage.wordCount + " word" + (passage.wordCount == 1 ? "" : "s") + ")";
		if (withAffix)
			name = config.prefix + name + config.postfix;
		return scrub(name);
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

	function makeHSV(hue, sat, val) {
		//Just reformats to a string.
		return hue.toFixed(2) + "," + sat.toFixed(2) + "," + val.toFixed(2);
	}

	function makeRGB(h, s, v) {
		//Converts HSV arguments to hexadecimal RGB format.
		//based on https://stackoverflow.com/a/17243070/4965965
    var r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    r = Math.round(r * 255).toString(16);
    g = Math.round(g * 255).toString(16);
    b = Math.round(b * 255).toString(16);
    return "#" + (r.length == 1 ? "0" : "") + r + (g.length == 1 ? "0" : "") + g + (b.length == 1 ? "0" : "") + b;
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
		//Don't need to separate nodes from passages for GraphML.
		var result = [];

		if ((config.omitSpecialPassages && passage.special) || passage.omit)
			return result;

		var scrubbedNameOrPid = getNameOrPid(passage);
		var styles = stylePassage(passage, label);

		//Push the node itself and the styles (because it's always styled in some way).
		result.push('<node id="' + passage.pid + '">');
		//result.push('\t<desc>' + scrubbedNameOrPid + '</desc>');
		result = result.concat(styles);
		result.push('</node>');
		
		//Push the link list.
		var links = graphLinks(passage, scrubbedNameOrPid);
		result = result.concat(links);

		return result;
	}

	function stylePassage(passage, label) {
		var styles = [];

		var hue = 0;
		var sat = 0;
		var val = 1;
		var pid = passage.pid;
		var content = passage.content;
		var tag = passage.theTag;
		var shape;
		var color, contrastColor;

		//Start with any special shape for the passage.
		if (config.snowstick && passage.ssBookmark) {
			shape = "TRAPEZ";
		} else if (passage.trace) {
			shape = "HEXAGON";
		} else if (pid == storyObj.startNode || _.find(storyObj.unreachable, function(str){return str == passage.name;})) {
			shape = "OCTAGON";
		} else if (config.ends && context.passage.hasTag(passage, config.endTag)) {
			shape = "ROUND_RECTANGLE";
		} else if (config.checkpoints && context.passage.hasTag(passage, config.checkpointTag)) {
			shape = "DIAMOND";
		} else {
			shape = "ELLIPSE";
		}

		/*
		//Add fill and bold styles.
		if (styles.length === 0 && passage.links.length === 0  && config.ends) {
			//We are at a terminal passage that isn't already styled as the start or an end.
			styles.push("style=\"filled,diagonals\"");
		} else if (styles.length) {
			styles.push("style=\"filled,bold\"");
		}	else if (config.color != "bw") {
			styles.push("style=filled");
		}
		*/

		contrastColor = "BLACK";
		//Calculate color.  Omitted font colors for now but could use the stroke color?
		if (config.color == "length") {
			//Graphviz supported HSV, so used it to create a red-to-blue/green range
			hue = Math.round(100 * (Math.min(1.75, passage.textLength / storyObj.avLength)) / 3)/100;
			color = makeRGB(hue,0.66,0.85);
		} else if (config.color == "tag" && tag) {
			var indx = storyObj.tags.indexOf(tag);
			if (indx > -1)
				hue = config.palette[indx%26]; //color alphabet colors
 			color = hue;
			contrastColor = config.paletteContrastColors[indx%26];
		} else if (config.color == "tag") {
			//No fill for you!
 		} else if (config.snowstick && passage.ssLeaf && ((config.ends && context.passage.hasTag(passage, config.endTag)) || passage.leaf)) {
			//Solid real leaves for clarity.
			hue = config.paletteExceptions.leafHue;
			color = makeRGB(hue,0.90,0.50);
 		} else if (config.snowstick && passage.ssLeaf) {
			//ssLeaf has been set to a fraction representing how recently it was read (0 for unread).
			//Use it to vary both saturation and value.
			hue = config.paletteExceptions.leafHue;
			sat = passage.ssLeaf;
			val = Math.round(100 * passage.ssLeaf / 5) / 100 + 0.50;  //Darker value range.
			color = makeRGB(hue,sat,val);
 		} else if (passage.trace) {
			color = config.paletteExceptions.trace;
 		} else if (config.snowstick && passage.ssRead) {
			//ssRead has been set to a fraction representing how recently it was read (0 for unread).
			//Use it to vary both saturation and value.
			hue = config.paletteExceptions.readHue;
			sat = passage.ssRead;
			val = Math.round(100 * passage.ssRead / 5) / 100 + 0.79;  //Lighter value range.
			color = makeRGB(hue,sat,val);
		} else if (pid == storyObj.startNode) {
			color = config.paletteExceptions.start;
		} else if (config.ends && context.passage.hasTag(passage, config.endTag)) {
			color = config.paletteExceptions.ends;
		} else if (_.find(storyObj.unreachable, function(str){return str == passage.name;})) {
			color = config.paletteExceptions.unreachable;
 		} else if (config.color == "tag") {
			color = config.paletteExceptions.untagged;
 		} else {
			color = config.paletteExceptions.default;
		}

		styles.push('\t<data key="g7">' + color + '</data>');
		//The yEd version.
		styles.push('\t<data key="d7">');
		styles.push('\t\t<yjs:ShapeNodeStyle fill="' + color + '" shape="' + shape + '"/>');
		styles.push('\t</data>');

		//Rename the node if a label or prefix was passed in.
		if (label || config.prefix || config.postfix) {
			if (label)
				label = config.prefix + label + config.postfix;
			else
				label = getNameOrPid(passage, false, false, true);
		} else 
			label = getNameOrPid(passage);

		styles.push('\t<data key="g4">' + label + '</data>');
		//The yEd version.
		styles.push('\t<data key="d4">');
		styles.push('\t\t<x:List>');
		styles.push('\t\t\t<y:Label LayoutParameter="{x:Static y:InteriorLabelModel.Center}">');
		styles.push('\t\t\t\t<y:Label.Text>' + label + '</y:Label.Text>');
		styles.push('\t\t\t\t<y:Label.Style>');
		//styles.push('\t\t\t\t\t<yjs:DefaultLabelStyle horizontalTextAlignment="CENTER" textFill="' + contrastColor + '" textSize="33"/>');
		styles.push('\t\t\t\t\t<yjs:DefaultLabelStyle horizontalTextAlignment="CENTER" textFill="' + contrastColor + '"/>');
		styles.push('\t\t\t\t</y:Label.Style>');
		styles.push('\t\t\t</y:Label>');
		styles.push('\t\t</x:List>');
		styles.push('\t</data>');

		/*
		//Add a tooltip.
		if (config.tooltips) {
			styles.push("tooltip=" + getNameOrPid(passage, true, true));
		}
		*/

		return styles;
	}

	function scrub(name) {
		//Put names into a legal xml format.
		if (name) {
			name = name.toString()
				.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
		}
		return name;
	}

	function writeClusters(tagObject) {
		var clusters = [];
		var clusterIndex = 0;
		for (var tag in tagObject) {
			if (tagObject.hasOwnProperty(tag) && !context.settings.isOmittedTag(tag) && (config.clusterTags.length == 0 || config.clusterTags.indexOf(tag) > -1)) {
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
				tagKey.push(tagName + " [shape=rect style=\"filled,rounded\" fillcolor=\"" + settings.palette[t%26] + "\" fontcolor=\"" + settings.paletteContrastColors[t%26] + "\"]");
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

context.graph = (function() {

	return {
		contrastColor: contrastColor,
		convert: convert,
		edit: edit,
		saveDot: saveDot,
		saveJSON: saveJSON,
		saveGML: saveGML,
		saveGraphML: saveGraphML,
		saveSvg: saveSvg,
		scale: scale
	};

	function contrastColor(color) {
		//color is an RGB color in the formats #abcdef or #abc (not clear that one can have worked).
		//To support other formats like named colors grab a library.
		if (color.charAt(0) != "#" || (color.length - 1) % 3 != 0)
			return "#000000";
		var colorArray = [];
		if (color.length - 1 == 3)
			colorArray = [color.charAt(1),color.charAt(2),color.charAt(3)];
		else
			colorArray = [color.substring(1,3),color.substring(3,5),color.substring(5,7)];
		colorArray = colorArray.map(function(elt){return parseInt(elt,16)/255;});
		var lumi = 0.299 * colorArray[0] + 0.587 * colorArray[1] + 0.114 * colorArray[2];
		return (lumi > 0.5 ? "#000000" : "#ffffff");
	}

	function convert() {
		//A change in the settings is what normally triggers (re)graphing, so (re)parse.
		context.settings.parse();
		context.story.parse();

		//Get the dot graph source.
		var output = context.dot.convert();
		
		//Write the dot graph text to the page.
		var dotTextarea = document.getElementById("dotfile");
		dotTextarea.value = output;
		//dotTextarea.style.height = dotTextarea.scrollHeight+'px'; 

		render(output);
		
		document.getElementById("jsonfile").value = context.json.convert();
		document.getElementById("gmlfile").value = context.gml.convert();
		document.getElementById("graphmlfile").value = context.graphml.convert();
	}
			
	function edit() {
		//The user can edit the dot graph and rerender it; 
		//in that case, read the dot file from the browser and render it.
		var editedOutput = document.getElementById("dotfile").value;

		render(editedOutput);
	}

	function saveDot() {
		var output = document.getElementById("dotfile").value;
		var blob = new Blob([output], {type: "text/plain;charset=utf-8"});
		filesaver.saveAs(blob, "dot" + Date.now() + "." + config.dotExtension, true);
 	}

	function saveJSON() {
		var output = document.getElementById("jsonfile").value;
		var blob = new Blob([output], {type: "text/plain;charset=utf-8"});
		filesaver.saveAs(blob, "json" + Date.now() + ".json", true);
 	}

	function saveGML() {
		var output = document.getElementById("gmlfile").value;
		var blob = new Blob([output], {type: "text/plain;charset=utf-8"});
		filesaver.saveAs(blob, "gml" + Date.now() + ".gml", true);
 	}

	function saveGraphML() {
		var output = document.getElementById("graphmlfile").value;
		var blob = new Blob([output], {type: "text/plain;charset=utf-8"});
		filesaver.saveAs(blob, "graphml" + Date.now() + ".graphml", true);
 	}

	function saveSvg() {
		//Read the existing svg off the page.
		var svgTxt = document.getElementById("graph").firstChild.outerHTML;
		var blob = new Blob([svgTxt], {type: "image/svg+xml;charset=utf-8"});
		filesaver.saveAs(blob, "dotgraph" + Date.now() + ".svg", true);
 	}

	function scale(by) {
		var svgElt = document.getElementsByTagName("svg")[0];
		svgElt.removeAttribute("height");

		//parseInt or parseFloat because all values are strings with "%" or "pt" attached.
		if (config.scale) {
			//set size to scale preset or apply increment as a percentage
			if (typeof by != "undefined") {
				var splitt = config.scale.split(/(\d+)/);
				var unit = splitt[splitt.length-1]; //"%";
				config.scale = parseInt(parseInt(svgElt.getAttribute("width"),10) * (1 + by),10) + unit;
			}
		} else {
			//need to parse the viewbox for the natural size.
			var viewBox = svgElt.getAttribute("viewBox").split(" ");
			// viewBox[2] is width, viewBox[3] is height, in points.

			//set size or apply increment as a point value
			if (typeof by == "undefined") {
				//The un-fit-to-page case.  Not needed for initial sizing, but for changes.
				config.scale = viewBox[2] + "pt";
			} else {
				config.scale = parseFloat(svgElt.getAttribute("width")) + (parseFloat(viewBox[2]) * by) + "pt";
			}
		}
		svgElt.setAttribute("width",config.scale);
		document.getElementById("scaleInput").value = config.scale;
	}

	//Private
	function render(output) {
		//Clear the area!
		document.getElementById("graph").innerHTML = "";

		//Do the conversion and write the svg to the page.
		viz.renderSVGElement(output, {engine: config.engine})
			.then(function(result){
				document.getElementById("graph").appendChild(result);
				context.graph.scale();
				if (config.snowstick) {
					//Activate the nodes for rebookmarking.
					document.querySelectorAll("#graph g.node text").forEach(function(elt){elt.addEventListener('click', context.settings.bookmark, false);});
				}
			})
			.catch(function(error){
				// Create a new Viz instance
				viz = new Viz();
				// Possibly display the error
				console.log(error);
			});
	}
	
})();

context.init = (function() {

	return {
		load: load
	};

	function load() {
		//Onload function.
		context.settings.load();
		context.settings.write();
		context.settings.toggle();
		activateForm();
		context.graph.convert();

		//Check for a passed-in URL.
		if (window.location.search && window.location.search.split("?")[1].length > 0) {
			context.story.load(window.location.search.split("?")[1]);
		}
	}

	//Private.
	function activateForm() {
		document.getElementById("settingsForm").addEventListener('click', context.graph.convert, false);
		document.getElementById("clusterTags").addEventListener('input', _.debounce(context.graph.convert,1000), false);
		document.getElementById("omitTags").addEventListener('input', _.debounce(context.graph.convert,1000), false);
		document.getElementById("trace").addEventListener('input', _.debounce(context.graph.convert,1000), false);

		//Not actually part of the settings form.
		document.getElementById("editButton").addEventListener('click', context.graph.edit, false);
		document.getElementById("saveDotButton").addEventListener('click', context.graph.saveDot, false);
		document.getElementById("saveJSONButton").addEventListener('click', context.graph.saveJSON, false);
		document.getElementById("saveGMLButton").addEventListener('click', context.graph.saveGML, false);
		document.getElementById("saveGraphMLButton").addEventListener('click', context.graph.saveGraphML, false);
		document.getElementById("saveSvgButton").addEventListener('click', context.graph.saveSvg, false);

		document.getElementById("scaleInput").addEventListener('change', function(){context.settings.scale();}, false);
		document.getElementById("scaleUpButton").addEventListener('click', function(){context.graph.scale(config.increment);}, false);
		document.getElementById("scaleDownButton").addEventListener('click', function(){context.graph.scale(-config.increment);}, false);

		document.getElementById("dotHeader").addEventListener('click', function(){context.settings.toggle("dotSection");}, false);
		document.getElementById("jsonHeader").addEventListener('click', function(){context.settings.toggle("jsonSection");}, false);
		document.getElementById("gmlHeader").addEventListener('click', function(){context.settings.toggle("gmlSection");}, false);
		document.getElementById("graphmlHeader").addEventListener('click', function(){context.settings.toggle("graphmlSection");}, false);
		document.getElementById("settingsHeader").addEventListener('click', function(){context.settings.toggle("settingsSection");}, false);
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
		passageObj.wordCount = source.innerText.trim() ? source.innerText.trim().split(/\s+/).length: 0;
		//Make it like Twine2.
		passageObj.pid = source.getAttribute("pid") ? source.getAttribute("pid") : index;
		passageObj.tagArray = tagArray;
		passageObj.theTag = getTheTag(tagArray);
		passageObj.name = source.getAttribute("name") ? source.getAttribute("name") : (source.getAttribute("tiddler") ? source.getAttribute("tiddler") : "Untitled Passage");
		passageObj.special = (specialPassageList.indexOf(passageObj.name) > -1);
		passageObj.omit = hasOmittedTag(passageObj);
		passageObj.trace = (config.trace && source.innerText.indexOf(config.trace) > -1);

		//SnowStick.
		if (config.snowstick) {
			passageObj.ssLeaf = Math.max(config.snowstickObj.leaf.indexOf(passageObj.name), 0) / Math.max(config.snowstickObj.leaf.length,1);
			passageObj.ssRead = Math.max(config.snowstickObj.read.indexOf(passageObj.name), 0) / Math.max(config.snowstickObj.read.length,1);
			passageObj.ssBookmark = (config.snowstickObj.bookmark == passageObj.name);
		}
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
		if (config.omitTags.length == 0 && config.omitSpecialTags == false) 
			return false;
		else {
			for (var t=0; t<passage.tagArray.length; t++) {
				if (context.settings.isOmittedTag(passage.tagArray[t]))
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
		var re3 = /\(display: \"(.*?)\"\)/g;
		var targetArray, target, target2;
		if (content) {
			//Clean up the content a bit (snowman), then extract links.
			// Remove /* comments */
			content = content.replace(/\/\*.*\*\//g, '');
			// Remove (starting) // comments
			content = content.replace(/^\/\/.*(\r\n?|\n)/g, '');
			
			while ((targetArray = re.exec(content)) !== null) {
				target = parseLink(targetArray[1],0);
				if (/^\w+:\/\/\/?\w/i.test(target)) {
					// do nothing with external links
				}	else {
					linkList.push(target);
				}
			}
			if (config.display) {
				while ((targetArray = re2.exec(content)) !== null) {
					target2 = parseLink(targetArray[1],1);
					if (/^\w+:\/\/\/?\w/i.test(target2)) {
						// do nothing with external links
					}	else {
						linkList.push(target2);
					}
				}
				while ((targetArray = re3.exec(content)) !== null) {
					target2 = parseLink(targetArray[1],1);
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
		bookmark: bookmark,
		ifid: ifid,
		isOmittedTag: isOmittedTag,
		load: load,
		parse: parse,
		scale: scale,
		toggle: toggle,
		write: write
	};

	function bookmark(e) {
		var newMark = e.target.innerHTML;
		if (!config.showNodeNames) {
			//newMark is a node ID, possibly renumbered, so find the title and trim it.
			//TODO.
			return;
		}
		if (newMark) {
			//Set the bookmark.
			var hyfid = ifid() ? "-" + ifid() : "";
			try {
				localStorage.setItem("snowstick-bookmark" + hyfid, newMark);
				config.snowstickObj["bookmark"] = localStorage.getItem("snowstick-bookmark" + hyfid) ? localStorage.getItem("snowstick-bookmark" + hyfid) : "";
			} catch (e) {
				console.log("Bookmarking failed.");
			}
		}
	};

	function ifid() {
		return window.document.querySelector('tw-storydata') ? window.document.querySelector('tw-storydata').getAttribute('ifid').toUpperCase() : "";
	};

	function isOmittedTag(tag) {
		if (config.omitTags.length == 0 && config.omitSpecialTags == false) 
			return false;
		else {
			if (config.omitTags.indexOf(tag) > -1)
				return true;
			if (config.omitSpecialTags && specialTagList.indexOf(tag) > -1)
				return true;
		}
		return false;
	}

	function load() {
		//Check localStorage for snowstick.
		try {
			var hyfid = ifid() ? "-" + ifid() : "";
			config.snowstickObj["read"] = localStorage.getItem("snowstick-read" + hyfid) ? JSON.parse(localStorage.getItem("snowstick-read" + hyfid)) : [];
			config.snowstickObj["leaf"] = localStorage.getItem("snowstick-leaf" + hyfid) ? JSON.parse(localStorage.getItem("snowstick-leaf" + hyfid)) : [];
			config.snowstickObj["bookmark"] = localStorage.getItem("snowstick-bookmark" + hyfid) ? localStorage.getItem("snowstick-bookmark" + hyfid) : "";
			config.snowstick = (config.snowstickObj.leaf.length > 0 || config.snowstickObj.read.length > 0 || config.snowstickObj.bookmark.length > 0);
		} catch (e) {
			config.snowstick = false;
			console.log("Error checking local storage for SnowStick data: " + e.description);
		}

		//Check story for settings.
		var DotGraphSettings;
		if (window.document.getElementById("storeArea"))
			DotGraphSettings = window.document.getElementById("storeArea").querySelector('div[tiddler="DotGraphSettings"]');
		else 
			DotGraphSettings = window.document.querySelector('tw-passagedata[name="DotGraphSettings"]');

		if (DotGraphSettings) {
			//Don't require dotgraph: label or single-line layout but must still parse as a JSON object.
			dgSettings = DotGraphSettings.innerText;
		} else {
			//Parse the StorySettings for dotgraph presets.  May fail mysteriously under Tweego 1.3.
			var StorySettings, dgSettings;
			if (window.document.getElementById("storeArea"))
				StorySettings = window.document.getElementById("storeArea").querySelector('div[tiddler="StorySettings"]');
			else 
				StorySettings = window.document.querySelector('tw-passagedata[name="StorySettings"]');
	
			if (StorySettings && StorySettings.innerText && StorySettings.innerText.indexOf("dotgraph:") > -1) {
				dgSettings = (StorySettings.innerText.split("dotgraph:")[1]).split("\n")[0];
			}
		}

		if (dgSettings) {
			try {
				dgSettings = JSON.parse(dgSettings);
			} catch(e) {
				console.log("Found but couldn't parse dotgraph settings: " + dgSettings);
				return;
			}
		}

		_.each(dgSettings, function(value, key) {
			//Do not reset snowstick to true if there's no data.
			if (key != "snowstick" || !value) 
				config[key] = value;
		});

		//Some settings are derived, so derive them now.
		derive();

		/* Lastly, switch color to snowstick if there's data and no 'false' setting.
		if (config.snowstick)
			config.color = "snow";*/
	}

	function parse() {
		//Check for config changes.
		config.checkpoints = document.getElementById("checkpointsCheckbox") ? document.getElementById("checkpointsCheckbox").checked : false;
		config.cluster = document.getElementById("clusterCheckbox") ? document.getElementById("clusterCheckbox").checked : false;
		config.clusterTags =  document.getElementById("clusterTags") ? splitAndTrim(document.getElementById("clusterTags").value) : [];
		config.color = document.querySelector("input[name='colorCheckbox']:checked") ? document.querySelector("input[name='colorCheckbox']:checked").value : "length";
		config.display = document.getElementById("displayCheckbox") ? document.getElementById("displayCheckbox").checked : true;
		config.ends = document.getElementById("endsCheckbox") ? document.getElementById("endsCheckbox").checked : false;
		config.engine = document.querySelector("input[name='engineCheckbox']:checked") ? document.querySelector("input[name='engineCheckbox']:checked").value : "dot";
		config.omitSpecialPassages = document.getElementById("specialCheckbox") ? document.getElementById("specialCheckbox").checked : false;
		config.omitSpecialTags = document.getElementById("specialTagCheckbox") ? document.getElementById("specialTagCheckbox").checked : false;
		config.renumber = document.getElementById("renumberCheckbox") ? document.getElementById("renumberCheckbox").checked : false;
		config.rotation = document.querySelector("input[name='rotateCheckbox']:checked") ? document.querySelector("input[name='rotateCheckbox']:checked").value : "TB";
		config.scale = document.getElementById("scaleInput") ? document.getElementById("scaleInput").value : "";
		config.showNodeNames = document.getElementById("nodeCheckbox0") ? document.getElementById("nodeCheckbox0").checked : false;
		config.omitTags = document.getElementById("omitTags") ? splitAndTrim(document.getElementById("omitTags").value) : [];
		config.lastTag = document.getElementById("lastTagCheckbox") ? document.getElementById("lastTagCheckbox").checked : false;
		config.countWords = document.getElementById("wcCheckbox") ? document.getElementById("wcCheckbox").checked : false;
		config.trace = document.getElementById("trace") ? trim(document.getElementById("trace").value) : "";

		//Some settings are derived, but not many in this case.
		//derive(afterChange);
	}

	function scale() {
		//Rescaling isn't handled like other settings.
		config.scale = document.getElementById("scaleInput") ? document.getElementById("scaleInput").value : "";
		context.graph.scale();
	}

	function toggle(section) {
		//Check all toggleable sections against the settings and adapt.
		if (section) {
			document.getElementById(section).style.display = (document.getElementById(section).offsetParent ? "none" : "");
		} else {
			if (config.hideDot)
				document.getElementById("dotSection").style.display = "none";
			if (config.hideGML)
				document.getElementById("gmlSection").style.display = "none";
			if (config.hideSettings)
				document.getElementById("settingsSection").style.display = "none";
		}
	}

	function write() {
		//Write the current config object as a settings panel.
		var output = _.template('<input type="radio" id="nodeCheckbox0" name="nodeCheckbox" value="names" <%= (showNodeNames ? "checked" : "") %>/><label for="nodeCheckbox">&nbsp;Passage titles</label> \
			<input type="radio" id="nodeCheckbox1" name="nodeCheckbox" value="pid"  <%= (showNodeNames ? "" : "checked") %> /><label for="nodeCheckbox">&nbsp;Passage ids (hover for title)</label> \
			<input type="checkbox" id="renumberCheckbox" name="renumberCheckbox" <%= (renumber ? "checked" : "") %>/><label for="renumberCheckbox">&nbsp;renumber from 1</label><br /> \
			<input type="radio" id="colorCheckbox0" name="colorCheckbox" value="bw" <%= (color == "bw" ? "checked" : "")%> />&nbsp;<label for="colorCheckbox0">Black & white</label> \
			<input type="radio" id="colorCheckbox1" name="colorCheckbox" value="length" <%= (color == "length" ? "checked" : "")%> />&nbsp;<label for="colorCheckbox1">Color by node length</label> \
			<input type="radio" id="colorCheckbox2" name="colorCheckbox" value="tag" <%= (color == "tag" ? "checked" : "")%>/>&nbsp;<label for="colorCheckbox2">Color by tag</label> ' + 
			(config.snowstick ? '<input type="radio" id="colorCheckbox3" name="colorCheckbox" value="snow" <%= (color == "snow" ? "checked" : "")%>/>&nbsp;<label for="colorCheckbox3" title="SnowStick">Color by read state</label>' : '') + '<br/> \
			<input type="checkbox" id="displayCheckbox" name="displayCheckbox" checked/>&nbsp;<label for="displayCheckbox">Include display macro links</label> \
			<input type="checkbox" id="wcCheckbox" name="wcCheckbox" <%= (countWords ? "checked" : "") %> />&nbsp;<label for="wcCheckbox">Include word counts (hover)</label><br/> \
			<input type="checkbox" id="specialCheckbox" <%= (omitSpecialPassages ? "checked" : "") %> />&nbsp;<label for="specialCheckbox">Omit&nbsp;special&nbsp;passages</label> (StoryTitle,&nbsp;etc.) \
			<input type="checkbox" id="specialTagCheckbox" <%= (omitSpecialTags ? "checked" : "") %> />&nbsp;<label for="specialTagCheckbox">Omit&nbsp;by&nbsp;special&nbsp;tags</label> (script,&nbsp;etc.)<br/> \
			<input type="radio" id="omitTagsFakeRadioButton" disabled/>&nbsp;<label for="omitTags">Omit by tag(s):</label>&nbsp;<input type="text" id="omitTags" placeholder="Separate tags with commas." value="<%=omitTags.join(", ")%>"/><br/> \
			<input type="checkbox" id="checkpointsCheckbox" <%= (checkpoint ? "checked" : "") %> />&nbsp;<label for="checkpointsCheckbox" title="This changes the shape of checkpoint passages to a diamond.">Detect checkpoint tags</label> \
			<input type="checkbox" id="endsCheckbox" <%= (ends == true ? "checked" : "") %>/>&nbsp;<label for="endsCheckbox" title="This changes the shape of end passages to an egg and puts diagonals on loose ends and disconnected nodes.">Detect end tags</label> \
			<input type="checkbox" id="lastTagCheckbox" <%= (lastTag ? "checked" : "") %> />&nbsp;<label for="lastTagCheckbox" title="The cluster and color by tag options normally use the first tag on each passage.">Use last tag</label><br/> \
			<input type="checkbox" id="clusterCheckbox" <%= (cluster ? "checked" : "") %> />&nbsp;<label for="clusterCheckbox">Cluster by tags:</label>&nbsp;<input type="text" id="clusterTags" placeholder="Separate tags with commas; leave blank for all tags." value="<%=clusterTags.join(", ")%>"/><br/> \
			<input type="radio" id="traceFakeRadioButton" disabled/>&nbsp;<label for="trace" title="Traced nodes are hex-shaped.">Trace phrase:</label>&nbsp;<input type="input" id="trace" value="<%=trace%>" /> <br/> \
			<input type="radio" id="engineCheckbox0" name="engineCheckbox" value="circo" <%= (engine == "circo" ? "checked" : "")%> />&nbsp;<label for="engineCheckbox0">circo</label> \
			<input type="radio" id="engineCheckbox1" name="engineCheckbox" value="dot" <%= (engine == "dot" ? "checked" : "")%> />&nbsp;<label for="engineCheckbox1">dot</label> \
			(<input type="radio" id="rotateCheckbox0" name="rotateCheckbox" value="TB" <%= (rotation == "TB" ? "checked" : "")%> />&nbsp;<label for="rotateCheckbox0" title="Top to bottom">&darr;</label> \
			<input type="radio" id="rotateCheckbox1" name="rotateCheckbox" value="LR" <%= (rotation == "LR" ? "checked" : "")%> />&nbsp;<label for="rotateCheckbox1" title="Left to right">&rarr;</label> \
			<input type="radio" id="rotateCheckbox2" name="rotateCheckbox" value="BT" <%= (rotation == "BT" ? "checked" : "")%> />&nbsp;<label for="rotateCheckbox2" title="Bottom to top">&uarr;</label> \
			<input type="radio" id="rotateCheckbox3" name="rotateCheckbox" value="RL" <%= (rotation == "RL" ? "checked" : "")%> />&nbsp;<label for="rotateCheckbox3" title="Right to left">&larr;</label>) \
			<input type="radio" id="engineCheckbox2" name="engineCheckbox" value="fdp" <%= (engine == "fdp" ? "checked" : "")%>/>&nbsp;<label for="engineCheckbox2">fdp</label> \
			<input type="radio" id="engineCheckbox3" name="engineCheckbox" value="neato" <%= (engine == "neato" ? "checked" : "")%>/>&nbsp;<label for="engineCheckbox3">neato</label> \
			<input type="radio" id="engineCheckbox4" name="engineCheckbox" value="osage" <%= (engine == "osage" ? "checked" : "")%>/>&nbsp;<label for="engineCheckbox4">osage</label> \
			<input type="radio" id="engineCheckbox5" name="engineCheckbox" value="twopi" <%= (engine == "twopi" ? "checked" : "")%>/>&nbsp;<label for="engineCheckbox5">twopi</label><br/>');
		document.getElementById("settingsForm").innerHTML = output(config);
		document.getElementById("scaleInput").value = config.scale;
	}

	function derive() {
		//Should also cover the exceptions, but haven't done them yet.
		config.paletteContrastColors = config.palette.map(function(color) {return context.graph.contrastColor(color);});
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

	function trim(tracePhrase) {
		tracePhrase = tracePhrase.trim();

		document.getElementById("traceFakeRadioButton").checked = (tracePhrase.length > 0);		
		return tracePhrase;
	}

})();

context.story = (function () {

	return {
		load: load,
		parse: parse
	};

	function load(theURL,retry) {
		//Load a story from a URL.
		//Clear now for clarity.
		if (document.querySelector('tw-storydata, div#storeArea'))
			document.querySelector('tw-storydata, div#storeArea').remove();
		if (!retry)
			document.getElementById("graph").innerHTML = "<p style='text-align:center;'><i>Loading</i> <tt>" + theURL + "</tt> ...<span id='loadingResult' style='color:tomato;'></span><p>";

		//Get the URL.  Some sites might not need the proxy, and in general it would be better to fail over them.
		if (!theURL)
			return;
		if (theURL.indexOf("t.co/") > 0 || theURL.indexOf("tads.org/") > 0) 
			theURL = ttCorsProxy + theURL;
		else
			theURL = corsProxy + theURL;

		var xhr = new XMLHttpRequest();
		xhr.onreadystatechange = loadListener;
		xhr.open('GET', theURL);
		xhr.responseType = 'document';
		xhr.send();
	};

	function loadListener() {
		//Parse the response for story bits.
		if (this.readyState != 4 || (this.status != 200 && this.status != 304)) {
			document.getElementById('loadingResult').innerHTML = " not found.";
			return;
		}

		var _story = this.response.querySelector('tw-storydata, div#storeArea');
		if (!_story) {
			var newURL;
			//Most browsers support responseURL so didn't bother to bind the original URL.
			var oldURL = this.response.url ? this.response.url : (this.responseURL ?  this.responseURL : "");
			var _meta = this.response.querySelector('meta[http-equiv=refresh]');
			if (_meta) {
				//Read the refresh manually.
				var _temp = this.response.querySelector('meta[http-equiv=refresh]').getAttribute('content');
				if (_temp)
					newURL = _temp.split(";URL=")[1];
			} else if (oldURL.indexOf("philome.la/") > -1 && oldURL.indexOf("/play") < 0) {
				//Fix philome.la links.
				newURL = oldURL + "/play";
			} else if (oldURL.indexOf("itch.io") > 0) {
				//If itch, try to break out of the frame.
				newURL = this.response.querySelector('iframe[src]').getAttribute('src');
				//Itch seems to be all https, and the src to lack a protocol.
				if (newURL.indexOf("http") < 0)
					newURL = "https:" + newURL;
			} else if (oldURL.indexOf("ifdb.tads.org") > 0) {
				//also blocking the cors server.
				newURL = this.response.querySelector('div#links-div a'); 
				if (newURL)
					newURL = newURL.getAttribute('href');
			}
			
			if (newURL)
				context.story.load(newURL,true);
			else
				document.getElementById('loadingResult').innerHTML = " failed.";
			return;
		}

		//Write story to the page (overwriting the existing story if necessary).
		document.querySelector("body").append(_story);

		//Programmatically choose some appropriate settings.
		config.scale = "";
		if (_story.children && _story.children.length && _story.children.length < 20) {
			config.showNodeNames = true;
		} else {
			config.showNodeNames = false;
		}
		//Rewrite the config because otherwise we'll read the old config.
		context.settings.write();

		//Graph.
		context.graph.convert();
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
			//This can occur with a missing story (as in DGaaS) or a failed load.
			storyObj.title = "Story not found";
			storyObj.startNode = "";
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
		//storyObj.reachable = storyObj.reachable.concat(specialPassageList);

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

		storyObj.unreachable = _.difference(storyObj.reachable, _.uniq(storyObj.reachable));
		storyObj.reachable = _.uniq(storyObj.reachable);
//_.pluck(storyObj.reachable,"name"),storyObj.reachable);
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
		document.getElementById("average").innerHTML = Math.round(100 * (storyObj.links / Math.max(storyObj.passages.length,1)))/100;

		document.getElementById("stats").setAttribute("title","Twine " + storyObj.twineVersion);
	}

})();
			
})(dotGraph);

window.onload = dotGraph.init.load();
