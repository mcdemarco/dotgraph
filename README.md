# DotGraph

DotGraph is a proofing format for Twine 1 and 2 that generates a GraphViz image of your story nodes.

To add DotGraph to Twine 2, use this URL (under Formats > Add a New Format): [https://mcdemarco.net/tools/scree/dotgraph/format.js](https://mcdemarco.net/tools/scree/dotgraph/format.js).

To add DotGraph to Twine 1, create a new folder called `dotgraph` inside your targets folder, then download this file [https://mcdemarco.net/tools/scree/dotgraph/header.html](https://mcdemarco.net/tools/scree/dotgraph/header.html) and place it inside the `dotgraph` folder.  (See the Twine wiki for more information about installing and using story formats in Twine 1.)

## Troubleshooting

DotGraph may fail to draw the graph in some versions of Twine 2 due to issues with Chrome; in that case it will still give you the text of the dot source file, as well as some links to sites online that will render it for you.

DotGraph may fail to save the SVG in Safari; if it fails, try a different browser.

## Versions

### 1.1.6

Added support for Twine 1.x, and some refactoring.

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

