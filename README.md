# web-auto-reader
Userscript that automatically reads through web pages and jumps to a random linked page

# How to Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) into your browser (I recommend Edge because Microsoft has an excellent set of text-to-speech engines).
2. On Tampermonkey's "Utilities" page, Import from URL using the URL of the raw script in this repository (https://raw.githubusercontent.com/gatebuildr/web-auto-reader/main/autoreader.js)
3. Make any changes you want for specific sites.

# How to Use

Select a voice and play/pause at the top of the page. You can change the voice at any time and it'll take effect at the next paragraph. Check the "Read Continuously" box and the script will automatically jump to the next selected page when it's done reading the current page. You can use the dropdown to manually change the next page (it'll be selected randomly to start), and hit the "Go Now" button to skip there immediately.

# Known Issues

* At least on MediaWiki pages, the header bar appears on top of the page contents instead of above it. I think this is because MediaWiki uses absolute positioning to plop down its contents and it's not a CSS issue I want to dive into right now. Make a pull request if it bothers you.
* There's nothing stopping it from going back to pages that have already been read, or getting stuck in a loop. That's one of the next things I want to address.
* There are still more parts of mediawiki pages that probably shouldn't be read aloud. This can be easily tweaked by changing the blockGrabbers at the top of the script.
* Other than pausing and resuming, there's no easy way to jump around the page right now.
* Fandom.com is a wretched pool of useless information and aggressive advertising.
