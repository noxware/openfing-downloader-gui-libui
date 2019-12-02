const axios = require('axios');
const path = require('path');
const fs = require('fs');
const progressStream = require('progress-stream');

 /*
    str.on('progress', function(progress)

    {
        percentage: 9.05,
        transferred: 949624,
        length: 10485760,
        remaining: 9536136,
        eta: 42,
        runtime: 3,
        delta: 295396,
        speed: 949624
    }
*/

async function downloadFile(url, destination, progress, interval) {
    return new Promise(async (resolve, reject) => {
        let response;

        try {
            response = await axios({
                method: "get",
                url: url,
                responseType: "stream"
            });
        } catch (error) {
            reject(error);
            return;
        }
    
        let ws = fs.createWriteStream(path.resolve(destination, url.substr(url.lastIndexOf('/') + 1)));

        ws.on("finish", () => {
            resolve();
        });

        ws.on("error", (error) => {
            reject(error);
        });

        let dataLength = response.headers["Content-Length".toLowerCase()];
        if (!dataLength) dataLength = 0;

        if (progress) {
            let sp = progressStream({
                length: dataLength,
                time: interval ? interval : 100,
            });

            sp.on('progress', progress);

            response.data.pipe(sp).pipe(ws);
        } else {
            response.data.pipe(ws);
        }
    });
}

module.exports = downloadFile;