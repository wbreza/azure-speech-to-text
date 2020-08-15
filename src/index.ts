import * as Speech from 'microsoft-cognitiveservices-speech-sdk';
import dotenv from 'dotenv'
import fs from 'fs';

interface SpeechSettings {
    subscriptionKey: string;
    region: string;
    language: string;
}

function speechToText(settings: SpeechSettings, audioStream: Speech.AudioInputStream) {
    const audioConfig = Speech.AudioConfig.fromStreamInput(audioStream);
    const speechConfig = Speech.SpeechConfig.fromSubscription(settings.subscriptionKey, settings.region);
    speechConfig.speechRecognitionLanguage = settings.language;
    speechConfig.outputFormat = Speech.OutputFormat.Detailed;

    const recognizer = new Speech.SpeechRecognizer(speechConfig, audioConfig);

    recognizer.recognized = (sender, e) => {
        if (e.result.reason === Speech.ResultReason.NoMatch) {
            var noMatchDetail = Speech.NoMatchDetails.fromResult(e.result);
            console.log(`\r\n(recognized)  Reason: ${Speech.ResultReason[e.result.reason]} NoMatchReason: ${Speech.NoMatchReason[noMatchDetail.reason]}`);
        } else {
            const json = JSON.parse(e.result.json);
            const confidence = (json.NBest[0].Confidence * 100).toFixed(2);
            console.log(`\r\n(recognized)  Reason: ${Speech.ResultReason[e.result.reason]} Text: (${confidence}%) ${e.result.text}`);
        }
    };

    recognizer.recognizing = (sender, e) => {
        const str = `(recognizing) Reason: ${Speech.ResultReason[e.result.reason]} Text: ${e.result.text}`;
        console.log(str);
    }

    recognizer.canceled = (s, e) => {
        var str = `(cancel) Reason: ${Speech.CancellationReason[e.reason]}`;
        if (e.reason === Speech.CancellationReason.Error) {
            str += ": " + e.errorDetails;
        }
        console.log(str);
    };

    // Signals that a new session has started with the speech service
    recognizer.sessionStarted = (s, e) => {
        var str = `(sessionStarted) SessionId: ${e.sessionId}`;
        console.log(str);
    };

    // Signals the end of a session with the speech service.
    recognizer.sessionStopped = (s, e) => {
        var str = `(sessionStopped) SessionId: ${e.sessionId}`;
        console.log(str);
    };

    // Signals that the speech service has started to detect speech.
    recognizer.speechStartDetected = (s, e) => {
        var str = `(speechStartDetected) SessionId: ${e.sessionId}`;
        console.log(str);
    };

    // Signals that the speech service has detected that speech has stopped.
    recognizer.speechEndDetected = (s, e) => {
        var str = `(speechEndDetected) SessionId: ${e.sessionId}`;
        console.log(str);

        recognizer.stopContinuousRecognitionAsync();
        process.exit();
    };

    recognizer.startContinuousRecognitionAsync(() => {
        console.log('START');
    });
}

function openPushStream(filename: string) {
    // create the push stream we need for the speech sdk.
    var pushStream = Speech.AudioInputStream.createPushStream()

    // open the file and push it to the push stream.
    fs.createReadStream(filename).on('data', function (arrayBuffer: ArrayBuffer) {
        pushStream.write(arrayBuffer);
    }).on('end', function () {
        pushStream.close();
    });

    return pushStream;
}

try {
    // Load environment files
    dotenv.config();

    // Configure settings
    const settings: SpeechSettings = {
        subscriptionKey: process.env.SPEECH_SUBSCRIPTION_KEY || '',
        region: process.env.SPEECH_REGION || '',
        language: process.env.SPEECH_LANGUAGE || ''
    };

    // Transcribe
    const stream = openPushStream('aboutSpeechSdk.wav');
    speechToText(settings, stream);
}
catch (e) {
    console.log(e);
}