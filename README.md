# DotGraph

DotGraph is a proofing format for Twine 1 and 2 that generates a GraphViz image of your story nodes.

To add DotGraph to Twine 2, use this URL (under Formats > Add a New Format): [https://mcdemarco.net/tools/scree/dotgraph/format.js](https://mcdemarco.net/tools/scree/dotgraph/format.js).

To add DotGraph to Twine 1, create a new folder called `dotgraph` inside your targets folder, then download this file [https://mcdemarco.net/tools/scree/dotgraph/header.html](https://mcdemarco.net/tools/scree/dotgraph/header.html) and place it inside the `dotgraph` folder.  (See the Twine wiki for more information about installing and using story formats in Twine 1.)

To use DotGraph to graph a published story, open an already-dotgrapphed story in a browser and add a question mark followed by the story's URL.  You can also do this by typing in the URL at the DotGraph site [here](https://mcdemarco.net/tools/scree/dotgraph/).

## Notes

The start node is double-circled, as are any unreachable nodes.  Traced nodes are hex-shaped.  When color is on, nodes that are linked but do not exist are colored white.  When color by length is on, all other nodes are colored in shades of red (shorter than average) to blue (longer than average) based on the relative length of their contents.

The cluster and color by tag options use the first tag on each passage unless *Use last tag* is checked; optionally detected special tags are ignored in this ordering.  Optional detection of an "End" tag changes the shape of "end" passages to an egg (and puts diagonals on loose ends and disconnected nodes).  Optional detection of a "checkpoint" tag changes the shape of checkpoint passages to a diamond.  The omit by tag(s) option omits the passage regardless of tag order.

Stray or misplaced nodes can result from the omit tags setting, or from duplicate passage names or other linking issues.

The layout <b>engine</b> options change the graph style; some options are slower than the default ("dot").

The image format is SVG.

## Troubleshooting

DotGraph may fail to draw the graph in some versions of Twine 2 due to issues with Chrome;
in that case it will still give you the text of the dot source file, as well as some links to sites online that can render it for you.

DotGraph may fail to save the SVG in Safari; if it fails, try a different browser.

## SnowStick

SnowStick is a bit of JavaScript and CSS you can add to stories that use Snowman-based story formats in order to track your reading/proofing progress and graph it with DotGraph.  It can also be used without DotGraph.  See [its separate README](snowstick/README.md) for more details.

## Versions

### 2.2.0

Add SnowStick (a reading tracker integrated with DotGraph), support for configuration using the DotGraphSettings passage (a safer and more flexible spot than StorySettings, though the latter is still supported), viewing another story by URL (a quicker way than by loading the story and this format into Twine), and Graphviz engine options (after updating to the latest [viz.js](http://viz-js.com)).

### 2.1.0

Add a text tracing option and and support for configuration using the StorySettings passage.

### 2.0.6

Add support for Harlowe's display macro, plus fix a leaf counting issue.

### 2.0.5

Add option to use last tag for tag colors/clusters, plus fix a start node issue.

### 2.0.4

Minor fix to tag display.

### 2.0.3

Counts and marks unreachable passages.

### 2.0.2

Optionally omit any passages with certain (user-specified) tags.

### 2.0.1

Optionally parse <<display>> links.

### 2.0.0

Refactored with support for Twine 1.x, offline use, omitting special passages, and renumbering nodes.

### 1.1.5

Added saving (except possibly on Safari).

### 1.1.4

Added various configuration options, scaling, and some statistics.

### 1.1.3

Decoration of terminal passages (either leaves, or marked with a tag "End").

### 1.1.2

Optional clustering by (first) tags.

### 1.1.1

Now in Technicolor!

### 1.1.0

Used the javascript graphviz engine (hosted elsewhere) for rendering in the browser.

### 1.0.0

Only built the dotfile and required an external renderer.  Not released.

## Building From Source

Run `npm install` to install dependencies.  Run `grunt package` to create the release versions for Twine under `dist/`.  Run `grunt --help` to list other grunt targets.

