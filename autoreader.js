// ==UserScript==
// @name         Wiki/Blog Autoreader
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://en.wikipedia.org/wiki/*
// @match        https://**.fandom.com/wiki/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=wikipedia.org
// @require      https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js
// @require      https://gist.githubusercontent.com/gatebuildr/c5da97db589cfb983b2cbf9a1a602ff9/raw/453b994b6723d15e8c772e8de1351fde90c15f91/waitForIt.js
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // If you're customizing this script, this is probably the only part you need to change.
    // Keys are plain-text regular expressions that match URLs of pages you want to read (you also need to add them to the // @match section above)
    // Values are functions that return a list of {element, text} where element is the HTML element and text is the text you want the speech synth to read.
    // This may require some manual massaging; for example, on mediawiki I cut out tables, thumbnails, and navigation sections, and trim the page to exclude notes and references. Also the text uses a replacer to get rid of [NN] inline citations.

    const mediaWikiGrabber = () => {
        let blocks = [].concat(
                [document.querySelector('#firstHeading')],
                Array.from(document.getElementById('mw-content-text').querySelector('div.mw-parser-output').children)
            )
            .filter(el=>window.getComputedStyle(el).display!=='none')
            .filter(el=>el.role!=='presentation')
            .filter(el=>el.role!=='navigation')
            .filter(el=>el.role!=='region')
            .filter(el=>el.nodeName!=='TABLE')
            .filter(el=>!el.classList.contains('thumb'))
            .map(element=>({element, text: element.innerText.replaceAll(/\[\d+\]/g, '')}))
            function trashElement(el) {
                if(el.querySelector('#Notes') || el.querySelector('#External_links')) {
                    return true
                }
                return false
            }
            const firstIndexToTrash = _.findIndex(blocks, ({element})=>trashElement(element))
            console.log({firstIndexToTrash})
            if(firstIndexToTrash > 0) {
                blocks = _.slice(blocks, 0, firstIndexToTrash)
            }

            return blocks
    }

    const blockGrabbers = {
        'en.wikipedia.org/wiki/([^/:]+)$': mediaWikiGrabber,
        'fandom.com/wiki/([^/]+)$': mediaWikiGrabber
    }

    // Optional extra regex matchers to ignore specific links that would otherwise be valid. For example, I'm skipping wikipedia articles starting with "List of"
    const ignoreLinks = [
        'wikipedia.org/wiki/List_of_'
    ]

    function htmlToElement(html) {
        var template = document.createElement('template');
        html = html.trim(); // Never return a text node of whitespace as the result
        template.innerHTML = html;
        return template.content.firstChild;
    }
    function getReadingBlocks() {
        for(const exp in blockGrabbers) {
            if(document.URL.match(RegExp(exp))) {
                return blockGrabbers[exp]()
            }
        }
        return []
    }

    async function main() {

        let config = sessionStorage.getItem("AutoReaderConfig")
        if(config) {
            config = JSON.parse(config)
        } else {
            config = {}
        }
        function persistConfig(cfg) {
            config = cfg
            sessionStorage.setItem("AutoReaderConfig", JSON.stringify(cfg))
        }
        persistConfig({
            rate: 1.0,
            autoRead: false,
            ...config
        })
        console.log(config)

        let ytPlayIcon
        let ytPauseIcon
        let playPauseButton
        let autoReadCheckbox
        let nextLinkSelect
        let goToNextButton

        function decoratePage() {
            const oldBody = document.createElement('div')
            for(const c of document.body.childNodes) {
                oldBody.appendChild(c)
            }
            document.body.insertAdjacentHTML('afterbegin', `<div style='overflow:hidden;display:block;position:fixed;top:0;width:100%;z-index:42069'>
        <div style="margin:auto;width:50%">
        <span>
        <select id='VoiceSelect'></select>
        <button id='PlayPause' style='height:20px'></button>
        <input type="checkbox" id="AutoRead" name="AutoRead">
<label for="AutoRead"> Read Continuously</label>
        </span>
        <div><span>
        Next up:
        <select id='NextLinkSelect'></select>
        <button id='GoToNext'>Go Now</button>
        </span></div>
        </div>
        </div>`)
            oldBody.id = 'OldBody'
            oldBody.style = 'display:block;margin-top:30px'
            document.body.appendChild(oldBody)

            ytPlayIcon = htmlToElement(`<svg height="100%" version="1.1" viewBox="0 0 36 36" width="100%"><use class="ytp-svg-shadow" xlink:href="#ytp-id-42"></use><path class="ytp-svg-fill" d="M 12,26 18.5,22 18.5,14 12,10 z M 18.5,22 25,18 25,18 18.5,14 z" id="ytp-id-42"></path></svg>`)
            ytPauseIcon = htmlToElement(`<svg display="none" height="100%" version="1.1" viewBox="0 0 36 36" width="100%"><use class="ytp-svg-shadow" xlink:href="#ytp-id-46"></use><path class="ytp-svg-fill" d="M 12,26 16,26 16,10 12,10 z M 21,26 25,26 25,10 21,10 z" id="ytp-id-46"></path></svg>`)
            playPauseButton = document.getElementById('PlayPause')
            playPauseButton.appendChild(ytPlayIcon)
            playPauseButton.appendChild(ytPauseIcon)

            autoReadCheckbox = document.getElementById('AutoRead')
            nextLinkSelect = document.getElementById('NextLinkSelect')
            goToNextButton = document.getElementById('GoToNext')

            document.styleSheets[0].addRule('.currentlyReading', 'background-color: #b2d6f3; !important;')
        }
        function setupSettings() {
            autoReadCheckbox.checked = config.autoRead
            autoReadCheckbox.addEventListener('change', () => persistConfig({
                ...config,
                autoRead: autoReadCheckbox.checked
            }))
        }
        function setupReader() {
            const validVoices = speechSynthesis.getVoices().filter(v=>v.lang.startsWith('en-'))

            let selectedVoice
            function setVoice(i) {
                selectedVoice = validVoices[i]
                persistConfig({
                    ...config,
                    selectedVoice: selectedVoice.name
                })
            }

            const vs = document.getElementById('VoiceSelect')
            validVoices.forEach(({name, lang, localService}, i) => {
                const o = document.createElement('option')
                o.value = i
                o.innerText = name
                vs.appendChild(o)
            })
            vs.addEventListener('change', () => {
                setVoice(vs.value)
            })

            const defaultVoiceName = config.selectedVoice
            if(defaultVoiceName) {
                console.log({defaultVoiceName})
                let index = validVoices.findIndex(v=>v.name===defaultVoiceName)
                console.log({index})
                if(index<0) {
                    index = 0
                }
                vs.value = index
                setVoice(index)
            }

            const blocksToRead = getReadingBlocks()
            let currentBlockIndex = 0

            speechSynthesis.cancel()
            let playing = false
            let utt = undefined

            function onChunkFinished() {
                blocksToRead[currentBlockIndex].element.classList.remove('currentlyReading')
                currentBlockIndex++
                readNextChunk()
            }

            function readNextChunk() {
                if(utt && speechSynthesis.paused) {
                    speechSynthesis.resume()
                } else if(currentBlockIndex >= blocksToRead.length) {
                    window.location = nextLinkSelect.value
                } else {
                    speechSynthesis.cancel()
                    const block = blocksToRead[currentBlockIndex]
                    console.log(block.element)
                    block.element.classList.add('currentlyReading')
                    block.element.scrollIntoView()
                    utt = new SpeechSynthesisUtterance(block.text)
                    //utt.rate = 2.0
                    utt.addEventListener('end', onChunkFinished)
                    utt.voice = selectedVoice
                    speechSynthesis.speak(utt)
                }
            }

            function startResumeSpeech() {
                playing = true
                ytPlayIcon.style.display='none'
                ytPauseIcon.style.display='block'
                readNextChunk()
            }
            document.startResumeSpeech = startResumeSpeech
            function pauseSpeech() {
                playing = false
                speechSynthesis.pause()
                ytPlayIcon.style.display='block'
                ytPauseIcon.style.display='none'
            }
            playPauseButton.addEventListener('click', () => {
                if(playing) {
                    pauseSpeech()
                } else {
                    startResumeSpeech()
                }
            })


        }
        function setupNavigation() {
            const thisPage = document.URL.replace(/#.+$/, '')
            let links = getReadingBlocks()
            .map(it=>it.element)
            .map(el=>Array.from(el.querySelectorAll('a')))
            .flat()
            .map(a=>{
                let name = a.title
                if(!name) {
                    name = a.innerText
                }
                const link = a.href.replace(/#.+$/, '')
                return {name, link}
            })
            .filter(it=>it.link!==thisPage)
            .filter(({link}) => {
                for(const re of ignoreLinks) {
                    if(link.match(RegExp(re))) {
                        return false
                    }
                }
                for(const exp in blockGrabbers) {
                    if(link.match(RegExp(exp))) {
                        return true
                    }
                }
                return false
            })
            links = _.sortBy(links, 'name')
            links = _.uniqBy(links, 'link')

            for(const {name, link} of links) {
                nextLinkSelect.insertAdjacentHTML('beforeend', `<option value="${link}">${name} (${link})</option>`)
            }
            const linkOptions = Array.from(nextLinkSelect.querySelectorAll('option'))
            if(linkOptions.length) {
                linkOptions[_.random(0, linkOptions.length-1)].selected=true
            }

            goToNextButton.addEventListener('click', () => window.location = nextLinkSelect.value)
        }

        await waitForIt(() => speechSynthesis.getVoices().length)
        await waitForIt(() => getReadingBlocks().length)
        decoratePage()
        setupSettings()
        setupReader()
        setupNavigation()

        if(config.autoRead) {
                document.startResumeSpeech()
            }
    }

    main()
})();
