"use strict";

const {
    UiWindow,
    UiCombobox,
    UiVerticalBox,
    UiHorizontalBox,
    UiForm,
    UiButton,
    UiMultilineEntry,
    UiGroup,
    UiLabel,
    UiProgressBar,
    startLoop,
    stopLoop,
    Size,
} = require('libui-node');

const download = require('./lib/downloadfile');

function toMB(b) {return (b / 1024 / 1024).toFixed(2)}

function threadProgress(n) {
    const container = new UiHorizontalBox();
    container.padded = true;

    const label = new UiLabel();
    label.text = `Thread ${n}`
    container.append(label, false);

    const progressBar = new UiProgressBar();
    progressBar.value = 0;
    container.append(progressBar, false);

    const progressText = new UiLabel();
    progressText.text = `--/-- MB`
    container.append(progressText, false);

    container.progressCb = progress => {
        progressBar.value = progress.percentage;
        progressText.text = `${toMB(progress.transferred)}/${toMB(progress.length)} MB`
    }

    container.reset = () => {
        progressBar.value = 0;
        progressText.text = '--/-- MB';
    }

    return container;
}

function downloadManager(urls, threads, destination) {
    // Constants

    const WINDOW_WIDTH = 600;
    const WINDOW_HEIGHT = 400;
    const WINDOW_RESIZABLE = false;

    // Window
    const window = new UiWindow('Download Manager', WINDOW_WIDTH, WINDOW_HEIGHT, false);
    window.margined = true;

    window.onClosing(function () {
        window.close();
        stopLoop();
        process.exit(0);
    });

    if (!WINDOW_RESIZABLE)
    window.onContentSizeChanged(function () {
        window.setContentSize(new Size(WINDOW_WIDTH, WINDOW_HEIGHT));
    });

    // Top widget
    const topWidget = new UiVerticalBox();
    topWidget.padded = true;
    window.setChild(topWidget);

    // Thread progress
    let threadBars = [];
    for (let i = 1; i <= threads; i++) {
        threadBars.push(threadProgress(i));
        topWidget.append(threadBars[i-1], false);
    }

    // Log textarea
    const logGroup = new UiGroup();
    logGroup.title = 'Log';
    logGroup.margined = true;
    topWidget.append(logGroup, true);

    const logTextEntry = new UiMultilineEntry();
    logTextEntry.readOnly = true;
    logGroup.setChild(logTextEntry);

    // Final step

    window.show();
    startLoop();
    
    // Log functions

    function logWrite(line) {
        logTextEntry.text += line + '\n';
    }

    function logRead() {
        return logTextEntry.text;
    }

    function logClear() {
        logTextEntry.text = '';
    }

    // Main

    async function main() {
        logWrite('Begin of log');
        //logWrite(urls.toString());

        let finished = false;

        for (let i = 1; i <= threads; i++) {
            (async () => {
                while (urls.length != 0) {
                    const currentUrl = urls.shift();

                    try {
                        logWrite(`Download of "${currentUrl}" asigned to Thread ${i}`);
                        await download(currentUrl, destination, threadBars[i-1].progressCb);
                        threadBars[i-1].reset();
                        logWrite(`Completed download of "${currentUrl}" asigned to Thread ${i}`)
                    } catch (e) {
                        logWrite(`ERROR: Failed to download ${currentUrl} from Thread ${i}`)
                        //logWrite(e)
                    }
                }

                /*if (!finished && !urls) {
                    finished = true;
                    logWrite('Downloads completed. Check for errors just in case.')
                }*/
            })();
        }

    }

    main();
}

module.exports = downloadManager;