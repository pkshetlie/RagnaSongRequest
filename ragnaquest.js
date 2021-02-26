let
    AdmZip = require('adm-zip'),
    dotenv = require('dotenv').config(),
    fetch = require('node-fetch'),
    fs = require('fs'),
    homedir = require('os').homedir(),
    http = require('http'),
    request = require('request'),
    tmi = require('tmi.js')
;

// Define configuration options
const opts = {
        identity: {
            username: process.env.TWITCH_USERNAME,
            password: process.env.TWITCH_TMI_OAUTH
        },
        channels: [
            process.env.TWITCH_CHANNEL
        ]
    }
;

// Create a client with our options
const client = new tmi.client(opts);
// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

client.connect();

function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
    // creation des dossiers necessaires
    fs.mkdir(homedir + "/Documents/Ragnarock/", false, () => {
    });
    fs.mkdir(homedir + "/Documents/Ragnarock/CustomSongs/", false, () => {
    });
}

function onMessageHandler(target, context, msg, self) {
    if (self) return
    if (msg.match(/!rq ([a-zA-Z0-9]*)/)) {
        console.log("requete demandée");
        let r = msg.split(' ');
        let infoRequest = "https://ragnasong.com/api/getMap/" + r[1]
        let settings = {method: "Get"};
        fetch(infoRequest, settings)
            .then(res => res.json())
            .then((json) => {
                if (json.title === undefined) {
                    client.say(target, "RagnaSong non trouvée");
                    return;
                }
                client.say(target, "requete demandée : " + json.title + " by " + json.artist + ", difficultés : " + json.difficulty + ", Envoyé par " + json.ownerUsername);
                let file = homedir + "/Documents/Ragnarock/CustomSongs/" + r[1] + ".zip";
                let folder = homedir + "/Documents/Ragnarock/CustomSongs/";
                var req = request(
                    {
                        method: 'GET',
                        uri: "https://ragnasong.com/api/map/" + r[1] + ".zip",
                        headers: {
                            "User-Agent": "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.97 Safari/537.11",
                            "Accept-Encoding": "gzip,deflate,sdch",
                            "encoding": "null",
                            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                            "Cookie": "cookie"
                        }
                    }
                );

                req.pipe(fs.createWriteStream(file));
                req.on('end', function () {
                    var zip = new AdmZip(file),
                        zipEntries = zip.getEntries();
                    zip.extractEntryTo(zipEntries[0], folder);
                    fs.unlink(file, () => {
                    });
                    client.say(target, "Musique prête à etre jouée");
                });
            });
    }
}
