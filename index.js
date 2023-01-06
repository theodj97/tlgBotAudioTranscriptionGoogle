import TelegramBot from 'node-telegram-bot-api';
import { SpeechClient } from '@google-cloud/speech';
import ffmpeg from 'fluent-ffmpeg';
import * as fileSinc from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// Telegram Bot Token
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
// Select your json Google Cloud Server credentials file.
const GCloudCredentials = JSON.parse(fileSinc.readFileSync('./turing-micron-373823-85350f399d44.json'));
const bot = new TelegramBot(telegramBotToken, { polling: true });
const speechClient = new SpeechClient({
    credentials: GCloudCredentials,
});
const filePathVoiceMsg = './audioFiles/';

bot.on('message', (msg) => {
    if (msg.voice) {
        bot.downloadFile(msg.voice.file_id, filePathVoiceMsg)
            .then((filePath) => {
                let outPut = filePathVoiceMsg + Date.now() + '.wav';
                ffmpeg()
                    .input(filePath)
                    .output(outPut)
                    .on('end', function () {
                        // Envía la solicitud y obtiene la respuesta
                        speechClient.recognize(getFileOptions(fileSinc.readFileSync(outPut).toString('base64')))
                            .then(response => {
                                const transcription = response[0].results
                                    .map(result => result.alternatives[0].transcript)
                                    .join('\n');
                                console.log(`Transcripción: ${transcription}`);
                                bot.sendMessage(msg.chat.id, transcription);
                                fileSinc.unlink(filePath, (err) => {
                                    if (err)
                                        console.log(err)
                                })
                            })
                            .catch(err => {
                                bot.sendMessage(msg.chat.id, 'No se ha reconocido ninguna palabra en el audio');
                                console.error('ERROR:', err);
                            });
                    })
                    .on('error', function (err) {
                        bot.sendMessage(msg.chat.id, 'El servidor no ha podido convertir la extensión del audio');
                        console.log('Error en la conversión del fichero: ' + err.message);
                    })
                    .run();
            })
            .catch((err) => {
                console.error(err);
            });
    } else {
        bot.sendMessage(msg.chat.id, 'Hello World');
    }
});

function getFileOptions(audioBytes) {
    // Devuelve la configuración de la solicitud de transcripción
    return {
        audio: {
            content: audioBytes,
        },
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 48000,
            languageCode: 'es-ES',
        },
    };
}