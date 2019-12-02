//"use strict";

const {
    UiWindow,
    UiCombobox,
    UiVerticalBox,
    UiHorizontalBox,
    UiForm,
    UiButton,
    UiMultilineEntry,
    UiGroup,
    UiEntry,
    startLoop,
    stopLoop,
    Size,
} = require('libui-node');

const fs = require('fs');
const os = require('os');
const path = require('path');

const openfing = require('./lib/openfing');
const downloadManager = require('./downloadManager');

// Constants

const WINDOW_WIDTH = 700;
const WINDOW_HEIGHT = 500;
const WINDOW_RESIZABLE = true;

const FOLDER_NAME = 'Openfing';

// Pre calculations
let DEFAULT_DESTINATION;

const HOME_DIR = os.homedir();

const POSIBLE_DESTINATIONS = [
    path.resolve(HOME_DIR, 'Videos'),
    path.resolve(HOME_DIR, 'Downloads'),
    path.resolve(HOME_DIR, 'Documents'),
    HOME_DIR,
    path.resolve('.')
]

for (const d of POSIBLE_DESTINATIONS) {
    if (dir(d) == 'OK') {
        DEFAULT_DESTINATION = d;
        break;
    }
}

// Fs functions

function dir(path) {
    try {
        if (fs.statSync(path).isDirectory())
            return 'OK';
        else
            return 'NOT_DIR';
    } catch (error) {
        if (error.code == 'ENOENT')
            return 'NOT_EXIST';
        else
            return 'ERROR';
    }
}

// Window
const window = new UiWindow('Openfing Downloader Personal Tool', WINDOW_WIDTH, WINDOW_HEIGHT, false);
window.margined = true;

window.onClosing(function () {
    window.close();
    stopLoop();
});

if (!WINDOW_RESIZABLE)
window.onContentSizeChanged(function () {
    window.setContentSize(new Size(WINDOW_WIDTH, WINDOW_HEIGHT));
});

// Top widget
const topWidget = new UiVerticalBox();
topWidget.padded = true;
window.setChild(topWidget);

// Options form
const optionsForm = new UiForm();
optionsForm.padded = true;
topWidget.append(optionsForm, false);

// Courses combo
const coursesCombobox = new UiCombobox();
optionsForm.append('Curso', coursesCombobox, false);

// Threads combo
const threadsCombobox = new UiCombobox();
optionsForm.append('Descargas paralelas', threadsCombobox, false);

// Destination

function checkDestination() {
    /*try {
        if (fs.lstatSync(destinationText.text).isDirectory())
            logWrite('Carpeta valida');
        else
            throw 'No es una carpeta';

        return true;
    } catch (error) {
        logWrite('Carpeta invalida');

        return false;
    }*/

    switch (dir(destinationText.text)) {
        case 'OK':
            logWrite('Carpeta valida');
            return true;

        case 'NOT_EXIST':
            logWrite('La carpeta no existe')
            break;
        case 'NOT_DIR':
            logWrite('La carpeta no es una carpeta')
            break;
        default:
            logWrite('Carpeta invalida');
            break;
    }

    return false;
}

const destinationContainer = new UiHorizontalBox();
destinationContainer.padded = true;

const destinationText = new UiEntry();
destinationText.text = DEFAULT_DESTINATION;

const checkDestinationButton = new UiButton();
checkDestinationButton.text = 'Check';
checkDestinationButton.onClicked(checkDestination);

destinationContainer.append(destinationText, true);
destinationContainer.append(checkDestinationButton, false);

optionsForm.append('Carpeta destino', destinationContainer, false);

for (let i = 1; i <= 5; i++)
    threadsCombobox.append(i.toString());

// Download button
const downloadButton = new UiButton();
downloadButton.text = "Download";
topWidget.append(downloadButton, false);

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

function loading() {
    //window.title = 'Loading...';

    coursesCombobox.enabled = false;
    threadsCombobox.enabled = false;
    downloadButton.enabled = false;
}

function ready() {
    //window.title = "Ready";

    coursesCombobox.enabled = true;
    threadsCombobox.enabled = true;
    downloadButton.enabled = true;
}

function error() {
    //window.title = "Error";

    coursesCombobox.enabled = false;
    threadsCombobox.enabled = false;
    downloadButton.enabled = false;
}

async function main() {
    logWrite('Inicio del log');
    logWrite('Descargando lista de cursos...');

    loading();

    let courses;

    try {
        courses = await openfing.getCourses();
        if (courses === undefined) {
            throw 'Undefined response';
        } else {
            for (const course of courses) {
                coursesCombobox.append(course.name);
            }
        
            ready();
        }
    } catch (e) {
        console.log(e);
        error();
        logWrite('ERROR: No se pudo descargar la lista de cursos');
        return;
    }

    coursesCombobox.onSelected(() => {
        const i = coursesCombobox.selected;
        logWrite(`Curso seleccionado "${courses[i].name}" codigo "${courses[i].code}"`)
    });

    threadsCombobox.onSelected(() => {
        logWrite(`Numero maximo de descargas paralelas establecido en ${threadsCombobox.selected + 1}`);
    });

    coursesCombobox.selected = 0;
    threadsCombobox.selected = 4;

    downloadButton.onClicked(async () => {
        if (!checkDestination()) return;

        const i = coursesCombobox.selected;

        loading();
        logWrite(`Descargando lista de clases para "${courses[i].code}"...`);

        try {
            const course = await openfing.getCourse(courses[i].code);
            if (course === undefined) {
                throw 'Undefined response';
            } else {
                logWrite('Generando lista de URLs...')
                //videoUrls = Object.keys(course.classes).map(c => openfing.getCourseChapterVideoURL(courses[i].code, c));

                let videoUrls = [];
                for (let c of Object.keys(course.classes)) {
                    videoUrls.push(await openfing.getCourseChapterVideoURL(courses[i].code, c));
                }

                const resultingDestination = path.resolve(destinationText.text, FOLDER_NAME, courses[i].code);
                logWrite(`Generando carpeta final "${resultingDestination}"...`);
                try {
                    fs.mkdirSync(resultingDestination, {recursive: true});
                } catch (error) {
                    logWrite('ERROR: No se pudo generar la carpeta final');
                    ready();
                    return;
                }

                logWrite('Abriendo Download Manager en 3 segundos, esta ventana se cerrara...');
                setTimeout(()=>{
                    //window.close();
                    //stopLoop();
                    downloadManager(videoUrls, threadsCombobox.selected + 1, resultingDestination);
                    window.close();
                }, 3000);

            }
        } catch (error) {
            console.log(error);
            logWrite(`ERROR: No se pudo descargar la lista de clases para "${courses[i].code}"`);
            ready();
        }
    });
}

main();