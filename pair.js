const { giftedid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");
const { Storage, File } = require("megajs");

const {
    default: Gifted_Tech,
    useMultiFileAuthState,
    delay,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

function randomMegaId(length = 6, numberLength = 4) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const number = Math.floor(Math.random() * Math.pow(10, numberLength));
    return `${result}${number}`;
}

async function uploadCredsToMega(credsPath) {
    try {
        const storage = await new Storage({
            email: 'frediezra360@gmail.com', // Your Mega A/c Email Here
            password: 'arusha2025#' // Your Mega A/c Password Here
        }).ready;
        console.log('Mega storage initialized.');
        if (!fs.existsSync(credsPath)) {
            throw new Error(`File not found: ${credsPath}`);
        }
        const fileSize = fs.statSync(credsPath).size;
        const uploadResult = await storage.upload({
            name: `${randomMegaId()}.json`,
            size: fileSize
        }, fs.createReadStream(credsPath)).complete;
        console.log('Session successfully uploaded to Mega.');
        const fileNode = storage.files[uploadResult.nodeId];
        const megaUrl = await fileNode.link();
        console.log(`Session Url: ${megaUrl}`);
        return megaUrl;
    } catch (error) {
        console.error('Error uploading to Mega:', error);
        throw error;
    }
}

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = giftedid();
    let num = req.query.number;
    let responseSent = false;

    async function cleanUpSession() {
        try {
            await removeFile('./temp/' + id);
        } catch (cleanupError) {
            console.error("Cleanup error:", cleanupError);
        }
    }

    async function GIFTED_PAIR_CODE() {
        const { version } = await fetchLatestBaileysVersion();
        console.log(`Using WhatsApp version: ${version}`);
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        try {
            let Gifted = Gifted_Tech({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari")
            });

            if (!Gifted.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Gifted.requestPairingCode(num);
                console.log(`Your Code: ${code}`);
                if (!responseSent && !res.headersSent) {
                    await res.send({ code });
                    responseSent = true;
                }
            }

            Gifted.ev.on('creds.update', saveCreds);
            Gifted.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(5000);
                    const filePath = __dirname + `/temp/${id}/creds.json`;
                    if (!fs.existsSync(filePath)) {
                        console.error("File not found:", filePath);
                        await cleanUpSession();
                        return;
                    }

                    const megaUrl = await uploadCredsToMega(filePath);
                    const sid = megaUrl.includes("https://mega.nz/file/")
                        ? '' + megaUrl.split("https://mega.nz/file/")[1]
                        : 'Error: Invalid URL';

                    console.log(`Session ID: ${sid}`);

                    const session = await Gifted.sendMessage(Gifted.user.id, { 
                        text: sid 
                    }, { 
                        disappearingMessagesInChat: true, 
                        ephemeralExpiration: 600 
                    });

                    const GIFTED_TEXT = `
sᴇssɪᴏɴ ɪᴅ ɢᴇɴᴇʀᴀᴛᴇᴅ✅*
______________________________
╭┉┉◇
║『 𝐘𝐎𝐔'𝐕𝐄 𝐂𝐇𝐎𝐒𝐄𝐮 FREE_INTERNET_BOT 』
╰┅┅◇
╭───◇
╞ 『••• 𝗩𝗶𝘀𝗶𝘁 𝗙𝗼𝗿 𝗛𝗲𝗹𝗽 •••』
╞〠 𝐓𝐮𝐭𝐨𝐫𝐢𝐚𝐥: _https://whatsapp.com/channel/0029VajweHxKQuJP6qnjLM31_
╞⭖ 𝐎𝐰𝐧𝐞𝐫: _https://wa.me/255784766591
╞⟴ 𝐑𝐞𝐩𝐨: _https://github.com/timnasa/FREE_INTERNET_BOT
╞〠 𝐖𝐚𝐂𝐡𝐚𝐧𝐧𝐞𝐥: _https://whatsapp.com/channel/0029VajweHxKQuJP6qnjLM31_
║ 💜💜💜
╰┈┈┈┈┈◇ 
 DEV FE 
______________________________

Use the Quoted Session ID to Deploy your Bot`;
                    await Gifted.sendMessage(Gifted.user.id, { 
                        text: GIFTED_TEXT 
                    }, { 
                        quoted: session, 
                        disappearingMessagesInChat: true, 
                        ephemeralExpiration: 600 
                    });

                    await delay(100);
                    await Gifted.ws.close();
                    await cleanUpSession();
                } else if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    console.log("Reconnecting...");
                    await delay(10000);
                    GIFTED_PAIR_CODE();
                }
            });
        } catch (err) {
            console.error("Service Has Been Restarted:", err);
            await cleanUpSession();
            if (!responseSent && !res.headersSent) {
                await res.send({ code: "Service is Currently Unavailable" });
                responseSent = true;
            }
        }
    }

    try {
        await GIFTED_PAIR_CODE();
    } catch (finalError) {
        console.error("Final error:", finalError);
        await cleanUpSession();
        if (!responseSent && !res.headersSent) {
            await res.send({ code: "Service Error" });
        }
    }
});

module.exports = router;
