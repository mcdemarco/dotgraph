/* SnowStick 0.1
	 M. C. DeMarco, 2019 
	 a plugin for reading/proofing Twine stories that use Snowman-based story formats.
	 for more information, see http://mcdemarco.net/tools/scree/snowstick/
	 MIT License
 */

/* Installation:
 * put this js into your story javascript, and the CSS in snowstick.css into your story stylesheet.
 */

var SnowStick = function(){

	/* Configuration options: 
	 *
	 * mode:
	 * proof mode: 
	 *   the passage title appears in a footer, and a note appears when the branch is completely proofed.
	 *   the passage is only marked proofed when the footer checkbox is checked off.
	 *   the links are restyled according to whether they're completely new, already proofed, or completed.
	 * read mode:
	 *   the percentage read is the only added UI element.
	 *   the passage is automatically marked read when read.
	 *   the links are restyled according to whether they're completely new, previously read, or completed.
	 * clear mode:
	 *   clears snowstick data so you can start over on the same story or switch between Twine 1 stories.
	 * off mode:
	 *   turns snowstick off without uninstalling the code.
	 *
	 * bookmark:
	 *   reopen story to the last proofed passage.
	 *
	 * leafedMessage:
	 *   message shown in the footer for fully-proofed leaves of the story.
	 */

  var config = {
    mode: 'read',
		openBookmark: true,
		leafedMessage: ' (all children checked) '
  };

	var previous = "";
	var ifid = "";

  // Here there be dragons.

  function init() {
		//Test init.
		if (config.mode == 'off')
			return;

		ifid += $("tw-storydata").attr("ifid") ? "-" + $("tw-storydata").attr("ifid").toUpperCase() : "";
		if (config.mode == 'clear') {
			clear("read");
			clear("leaf");
			return;
		}

		//Create the proofing UI.
		if (config.mode == 'read')
			$("body").append('<div id="snowstick-percent" title="">0%</div>');
		else
			$("body").append('<div id="snowstick-footer">Proofing ' +
											 '<label for="snowstick-check" id="snowstick-name" title=""></label>: ' +
											 '<input id="snowstick-check" type="checkbox"/>' + 
											 '<span id="snowstick-leafed" style="display:none;"> ' + 
											 config.leafedMessage + ' </span>' + 
											 '<span id="snowstick-percent">0%</span></div>');
		//This class is used to change link styles, including crossing out leafed options.
		$("body").addClass("snowstick").addClass("snowstick-" + config.mode);

		$(document).on('startstory start.sm.story', function() {
			//Extend the passages object. 
			var proofs = retrieve("read");
			var leafs = retrieve("leaf");
			for (var p=0; p<window.story.passages.length; p++) {
				var pass = window.story.passages[p];
				if (pass && pass.hasOwnProperty("name")) {
					pass.proofed = (proofs.indexOf(pass.name) > -1);
					pass.leafed = (leafs.indexOf(pass.name) > -1);
				}
			}
		
			//Initialize the percentage.
			$("#snowstick-percent").html(Math.round(100 * proofs.length/window.story.passages.length) + "%");

			//If there's a bookmark saved, go to it.
			if (config.openBookmark) {
				previous = SnowStick.retrieve("bookmark",true);
				if (previous && _.findWhere(window.story.passages, {name: previous})) {
					window.story.startPassage = (_.findWhere(window.story.passages, {name: previous})).id;
					$("#snowstick-percent").attr("title",previous);
				}
			} else {
				//Need to unset the bookmark to avoid loop issues.
				SnowStick.store("bookmark","",true);
			}
		});

		if (config.mode == 'read') {
			$(document).on('showpassage:after shown.sm.passage', function(event, passage) {
				if (window.passage.name) {
					window.passage.proofed = true;
					var newLength = SnowStick.pusher("read",window.passage.name,true);
					$("#snowstick-percent").html(Math.round(100 * newLength/window.story.passages.length) + "%");
					//Put the passage id and title in a tooltip.
					$("#snowstick-percent").attr("title",window.passage.id + ": " + window.passage.name);

					//Style the links.  Expensive.
					$("#passage a[data-passage]").each(function(){
						var passageName = _.unescape($(this).data("passage"));
						var targetPassage = _.findWhere(window.story.passages, {name: passageName});
						if (targetPassage) {
							if (targetPassage.proofed)
								$(this).addClass("snowstick-read");
							if (targetPassage.leafed)
								$(this).addClass("snowstick-leaf");
						}
					});

					//Do the leaf checking.  Counts are the same when all leafed.
					//The other case covers simple loops where the only remaining target is where we just were.
					var linkCount = $('#passage a[data-passage]').length;
					var leafCount = $('#passage a.snowstick-leaf').length;
					var previous = SnowStick.retrieve("bookmark",true);
					if (window.passage.name && (linkCount == leafCount ||
							(linkCount - leafCount == 1 && previous && previous ==
							 _.unescape($('#passage a[data-passage]:not(.snowstick-leaf)').data("passage"))))) {
						$('#snowstick-leafed').show();
						//push the leaf; the function will check if it's new.
						window.passage.leafed = true;
						SnowStick.pusher("leaf",window.passage.name,true);
					} else {
						$('#snowstick-leafed').hide();
					}
				}
			});
		} else {//mode == 'proof'
			$(document).on('showpassage:after', function(event, passage) {
				if (window.passage.name) {
					//Write the name to the footer and the id to its tooltip, in case someone cares.
					$("#snowstick-name").html(window.passage.name).attr("title",window.passage.id);

					//Show the checkbox with its value.
					$("#snowstick-check").prop("checked",window.passage.proofed);
				}
				//Style the links.  Expensive.
				$("#passage a[data-passage]").each(function(){
					var passageName = _.unescape($(this).data("passage"));
					var targetPassage = _.findWhere(window.story.passages, {name: passageName});
					if (targetPassage) {
						if (targetPassage.proofed)
							$(this).addClass("snowstick-read");
						if (targetPassage.leafed)
							$(this).addClass("snowstick-leaf");
					}
				});
				//Regardless, do the leaf checking.  (Slightly different from the other case.)
				var linkCount = $('#passage a[data-passage]').length;
				var leafCount = $('#passage a.snowstick-leaf').length;
				var previous = SnowStick.retrieve("bookmark",true);
				if (window.passage.name && window.passage.proofed && (linkCount == leafCount ||
					(linkCount - leafCount == 1 && previous && previous ==
						_.unescape($('#passage a[data-passage]:not(.snowstick-leaf)').data("passage"))))) {
					$('#snowstick-leafed').show();
					//push the leaf; the function will check if it's new.
					window.passage.leafed = true;
					SnowStick.pusher("leaf",window.passage.name,true);
				} else {
					$('#snowstick-leafed').hide();
				}
			});
			$("body").on("change", "#snowstick-check", function(e) {
				//Set the value.
				var proofed = $(e.target).prop("checked");
				window.passage.proofed = proofed;
				
				//Update local storage and the UI.
				var newLength = SnowStick.pusher("read", window.passage.name, proofed);
				$("#snowstick-percent").html(Math.round(100 * newLength/window.story.passages.length) + "%");
			});
		}
		//Both cases.
		$(window).on('popstate', function(event) {
			//Reset this to avoid mistakes from going back.
			SnowStick.store("bookmark","",true);
		});
		$(document).on('hidepassage hide.sm.passage', function(event, passage) {
			//We store the previous passage name to check for simple loops and to bookmark.
			if (window.passage.name)
				SnowStick.store("bookmark",window.passage.name,true);
		});
  };

	/* helper functions */

	/**
	 Clears a local storage key.

	 @method clear
	 @param keya {String} the local storage item subkey
	 @return {bool} success or failure
	**/

  function clear(keya) {
		var key = "snowstick-" + keya + ifid;
		try {
			localStorage.removeItem(key);
		} catch (e) {
			console.log("Local storage write error: " + e.description ? e.description : e.name);
			return false;
		}
		return true;
	};

	/**
	 Stores an array to a local storage key as JSON,
	 with all the related nonsense.  

	 @method store
	 @param keya {String} the local storage item subkey
	 @param arya {array} the array to be stored
	 @return {bool} success or failure
	**/

  function store(keya,arya,isString) {
		var key = "snowstick-" + keya + ifid;
		try {
			if (isString)
				localStorage.setItem(key, arya);
			else
				localStorage.setItem(key, JSON.stringify(arya));
		} catch (e) {
			console.log("Local storage write error: " + e.description ? e.description : e.name);
			return false;
		}
		return true;
	};

	/**
	 Returns a JSON array from a local storage key, 
	 with all the related nonsense.

	 @method retrieve
	 @param keya {String} the local storage item key
	 @return {object or array} the parsed JSON object
	**/

	function retrieve(keya,isString) {
		var key = "snowstick-" + keya + ifid;
		var arya = isString ? "" : [];
		try {
			if (isString)
				arya = localStorage.getItem(key) ? localStorage.getItem(key) : "";
			else 
				arya = localStorage.getItem(key) ? _.chain(JSON.parse(localStorage.getItem(key))).reverse().uniq().reverse().value() : [];
		} catch (e) {
			console.log("Local storage read error: " + e.description ? e.description : e.name);
		}
		return arya;
	};

	/**
	 Pushes or pops an array element to/from the specified local storage key.

	 @method pusher
	 @param keya {String} the local storage item subkey
	 @param passa {String} the passage name to be pushed or removed
	 @param pusha {Bool} whether to push (true) or remove (false) the passage
	 @return {int} current length of the array.
	**/

	function pusher(keya,passa,pusha) {
		var ppa = retrieve(keya);
		//Always remove.
		ppa = _.without(ppa,passa);
		if (pusha) {
			//Push to new spot.
			ppa.push(passa);
		}

		//Save the changes and return size.
		store(keya, ppa);
		return ppa.length;
	}
 
  // public methods and variable(s)
  return {
    init:init,
    previous:previous,
		pusher:pusher,
		retrieve:retrieve,
		store:store
  };
}();

SnowStick.init();

