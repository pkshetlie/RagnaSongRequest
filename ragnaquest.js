let
    AdmZip = require('adm-zip'),
    dotenv = require('dotenv').config(),
    fetch = require('node-fetch'),
    fs = require('fs'),
    homedir = require('os').homedir(),
    http = require('http'),
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
if (opts.identity.username === undefined || opts.identity.password === undefined || opts.channels.length === 0) {
    console.log('Il manque les parametrages');
}
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

let downloaded = [];

const downloadFile = (async (url, path) => {
    const res = await fetch(url);
    const fileStream = fs.createWriteStream(path);
    await new Promise((resolve, reject) => {
        res.body.pipe(fileStream);
        res.body.on("error", reject);
        fileStream.on("finish", resolve);
    });
});

function onMessageHandler(target, context, msg, self) {
    if (self) return

    if (msg.match(/!rq ([a-zA-Z0-9]*)/)) {
        console.log("requete demandée");
        let r = msg.split(' ');
        if (downloaded.includes(r[1])) {
            client.say(target, "RagnaSong déjà demandée");
            return;
        }
        downloaded.push(r[1]);
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

                downloadFile("https://ragnasong.com/api/map/" + r[1] + ".zip", file)
                    .then(response => {
                        let zip = new AdmZip(file),
                            zipEntries = zip.getEntries();
                        try {
                            zipEntries.forEach(function (zipEntry) {
                                let name = zipEntry.entryName.toString();
                                let songFolder = json.title;
                                if (!name.match(/autosave/)) {
                                    let spl = name.split('/');
                                    if (spl.length === 1) {
                                        zip.extractEntryTo(zipEntry, folder + songFolder.trim() + "/");
                                    } else {
                                        zip.extractEntryTo(zipEntry, folder);
                                    }
                                }
                            });
                        } catch (e) {
                            console.log(e)
                        }
                        fs.unlink(file, () => {});
                        client.say(target, "Musique prête à etre jouée");
                    });
            });
    }
}
