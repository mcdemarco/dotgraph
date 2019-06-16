# SnowStick

SnowStick is a bit of JavaScript and CSS you can add to stories that use Snowman (or other story formats based on it), in order to track your reading/proofing progress and graph it with DotGraph.  SnowStick can be used without DotGraph, in which case you can still tell where you've been by the link styling (crossed-out for completed branches, squiggly underlining for previously visited links, and no alteration for unvisited links).

## Installation

### Twine 2

1. Put the javascript from `snowstick.js` into your Story JavaScript using the Twine menu item *Edit Story JavaScript*.
2. Set a mode manually at the top of the javascript (see below).
3. Put the CSS from `snowstick.css` into your Story Stylesheet using the Twine menu item *Edit Story Stylesheet*.

### TweeGo

1. Save the files `snowstick.js` and `snowstick.css` to the directory that contains your story file(s).
2. To change the mode, edit the configuration at the top of `snowstick.js` using your favorite text editor.

### Twine 1 or Twee

(This applies to any Twee processor, including TweeGo if you prefer to do it this way.)

1. Put the javascript from `snowstick.js` into a passage tagged *script*.
2. Set a mode manually at the top of the javascript (see below).
3. Put the CSS from `snowstick.css` into a passage tagged *stylesheet*.

## Mode

SnowStick has two main `modes`, *proof* and *read*; you should set one at the top of the SnowStick JavaScript (where you can also set some minor configuration options):

    var config = {
      mode: 'read',
	  openBookmark: true,
      leafedMessage: ' (all children checked) ',
	  bar: false
    };

In *proof* mode:

* the passage title and overall percentage read appear in a footer, and a note appears when the branch is completely proofed; you can change the note using the `leafedMessage` option
* the percentage can be replaced with a gradient bar by setting the `bar` option to *true*
* the passage is only marked proofed when the footer checkbox is checked off.
* the links are restyled according to whether they're completely new, already proofed, or completed.

In *read* mode:

* the percentage read is the only added UI element (hover on it for details);
* the percentage can be changed from text to a bar by setting the `bar` option to *true*
* the passage is automatically marked read when read.
* the links are restyled according to whether they're completely new, previously read, or completed.

There is also a *clear* mode for clearing all read data from the current browser.
You can use this to start fresh on the current story, or to switch between Twine 1 stories. (See *Issues* below).

In *off* mode, SnowStick is turned off (without uninstalling the code).

## Bookmarking

SnowStick will, optionally, start the story from the passage you left off at.  If the story format is managing your story state (or if state matters), you may want to turn this feature off by setting `openBookmark` to *false*.  You can switch it on and off again as necessary to restart the story.

## Issues

SnowStick stores its data in your browser's localStorage, so for it to work you must open your story in the same browser and not clear or disable your browser's local storage while reading.  You can make changes to the story and republish it, however, without confusing SnowStick.  (If you change the IFID, it will be treated as a different story.)

In certain cases, such as Twine 1 stories and other stories without IFID, SnowStick will need to be cleared between stories.  To read more than one such story at a time, use a different browser for each story (*e.g.,* Chrome vs. Brave).  (This is not a concern for Twine 2 stories that have distinct IFIDs.)

The total passage count includes special and unreachable passages, so you may not hit 100%.

## ToDo

It would be nice to validate the current read/leaf lists against the full passage list (in case passage names change), but that could slow things down and should perhaps be a separate mode.

## Versions

### 0.1

Betaish.
