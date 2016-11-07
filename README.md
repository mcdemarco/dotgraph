# DotGraph

DotGraph is a proofing format for Twine 2 that generates a GraphViz image of your story nodes.

To add DotGraph to Twine 2, use this URL (under Formats > Add a New Format): [https://mcdemarco.net/tools/scree/dotgraph/format.js](https://mcdemarco.net/tools/scree/dotgraph/format.js).

## Troubleshooting

DotGraph may fail to draw the graph in some versions of Twine 2 due to issues with Chrome; in that case it will still give you the text of the dot source file, as well as some links to sites online that will render it for you.

## Versions

Unreleased:  optional clustering by (first) tags.

### 1.1.1

Now in Technicolor!

### 1.1.0

Used the javascript graphviz engine (hosted elsewhere) for rendering in the browser.

### 1.0.0

Only built the dotfile and required an external renderer.  Not released.

## Building From Source

Run `npm install` to install dependencies.  Run `grunt package` to create a release version for Twine under `dist/`.  Run `grunt --help` to list other grunt targets.

