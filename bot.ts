const Telegraf = require('telegraf');
const fe = require('./fetcher');
const sun = require('./sunlocator');
import { YandexWeather } from './weather';
import fetch from 'node-fetch';
import moment from 'moment';
import {Registrator} from "./registrator";
import { UXEvent } from './fetcher';
import { UnitController } from './unit';
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


let token = '776154170:AAELvoF6Tro_C2PMpSfAYit3j0VrZO1-47A';

let botActiveChats: number[] = [];

// HG чат
// let hgChatId = -395832167;
// SS личка
//let hgChatId = 474062218;

let version = '0.4.0';
const bot = new Telegraf(token);

// запускаем бот астро трекинга
const sunLocator = new sun();

// запускаем бот погоды
const weather = new YandexWeather();

// запускаем регистратор
const registrator = new Registrator('https://hellgame24.ru');

registrator.getStream().subscribe(chats => {
    botActiveChats.push(...chats.map(c => +c));
});

// запускаем fetcher событий на hg24
let fetcher = new fe('http://hellgame24.ru');

// bot.on('message', (ctx, next) => {
//     console.log('message...:', ctx.message.message_id, ' from: ', ctx.message.from.username, ' - ', ctx.update.message['text'] );
//     console.log('chat:', ctx.message.chat.id);
//     // echo mode
//     // ctx.reply(ctx.message['text']);
//     next();
// });

bot.command('echo', (ctx) => {
    ctx.reply(ctx.message.text);
    console.log('echo fired');
});

bot.hears('check', (ctx) => {
    console.log('check///');
    ctx.reply('Системное время сервера: ' + moment().format('DD:MM:YYYY HH:mm:ss'));
});

bot.hears('check', (ctx) => {
    console.log('check fe:', fetcher);
    ctx.reply('Проверка сервиса version: ' + version + ' последняя запись в event log id: ' + fetcher.lastId + ' интервал опроса HG24: ' + fetcher.interval + 'ms', { reply_to_message_id: ctx.message.message_id} );
    // ctx.reply('Проверка сервиса version: ' + version + ' последняя запись в event log id: ' + fetcher.lastId + ' интервал опроса HG24: ' + fetcher.interval + 'ms');
    setTimeout(() => ctx.reply('Системное время сервера: ' + moment().format('DD:MM:YYYY HH:mm:ss'), { reply_to_message_id: ctx.message.message_id}  ), 3000);
});

bot.hears('map', (ctx) => {
    console.log('check map...');

    UnitController.getAllUnits().then(str => {
        ctx.replyWithPhoto(str, { reply_to_message_id: ctx.message.message_id} );
    });
});

bot.hears('sun', (ctx) => {

    setTimeout(() => ctx.reply('Ночь: ' + sunLocator.nightTime.format('DD:MM:YYYY HH:mm:ss') + ' День: ' + sunLocator.dayTime.format('DD:MM:YYYY HH:mm:ss'), { reply_to_message_id: ctx.message.message_id} ), 1500);
    setTimeout(() => ctx.reply('Утро -  синий час: ' + sunLocator.blueHourMTime.format('DD:MM:YYYY HH:mm:ss') + ' золотой час: ' + sunLocator.goldHourMTime.format('DD:MM:YYYY HH:mm:ss'), { reply_to_message_id: ctx.message.message_id} ), 500);
    setTimeout(() => ctx.reply('Вечер - золотой час: ' + sunLocator.goldHourETime.format('DD:MM:YYYY HH:mm:ss') + ' синий час: ' + sunLocator.blueHourETime.format('DD:MM:YYYY HH:mm:ss'), { reply_to_message_id: ctx.message.message_id} ), 2500);

    ctx.reply('Интервал обновления состояния: ' + sunLocator.interval + 'ms. Состояние: ' + sunLocator.currentState + ' ( ' + sunLocator.currentStateTitle + ' ) - ' + sunLocator.currentStateDescription, { reply_to_message_id: ctx.message.message_id} );

    setTimeout(() => ctx.reply('Системное время сервера: ' + moment().format('DD:MM:YYYY HH:mm:ss'), { reply_to_message_id: ctx.message.message_id}  ), 3000);
    setTimeout(() => ctx.reply('Последнее обновление: ' + sunLocator.lastupdate.format('DD:MM:YYYY HH:mm:ss'), { reply_to_message_id: ctx.message.message_id}  ), 4000);
});

bot.hears('weather', (ctx) => {
    if(weather.raw)
        ctx.reply('Интервал обновления состояния: ' + weather.interval + 'ms. Состояние: ' + weather.currentState + ' ( ' + weather.currentStateTitle + ' ) - ' + weather.currentStateDescription, { reply_to_message_id: ctx.message.message_id} );
    setTimeout(() => ctx.reply('Последнее обновление: ' + weather.lastupdate.format('DD:MM:YYYY HH:mm:ss') , { reply_to_message_id: ctx.message.message_id} ), 3000);
});

bot.start((ctx) => ctx.reply('Hello'));

bot.hears('regme', (ctx) => {
    console.log('regme fired');
    registrator.addRegistration(ctx).then((registered) => {
        botActiveChats.push(registered);
        console.log('registered id: ', registered, ' elapsed:', botActiveChats);
        ctx.reply('Ваш чат зарегистрирован в рассылку HG24, для отмены наберите unregme', { reply_to_message_id: ctx.message.message_id});
    });
});

bot.hears('unregme', (ctx) => {
    console.log('unregme fired');
    registrator.unRegistration(ctx).then((unregistered) => {
        botActiveChats.splice(botActiveChats.indexOf(unregistered), 1);
        console.log('unregister id: ', unregistered, ' elapsed:', botActiveChats);
        ctx.reply('Ваш чат убран из рассылки бота HG24, надеемся увидеть вас снова', { reply_to_message_id: ctx.message.message_id});
    });
});

function initHandlers(): void {

    console.log('initHandlers');

    setTimeout(() => {
        sunLocator.start();
        weather.start();
    },5000)


    sendMessage('Сервис бота успешно запущен').then(() => null).catch(() => null) ;


    fetcher.getStream().subscribe( (events: UXEvent[]) => {
        if( events && events.length ) events.filter(e => e.telegram_notify).forEach((ev, idx) => {
            let msg = 
                    `Событие 
                    ${ ev.level === 'info' ? 'ℹ️' : ''}
                    ${ ev.level === 'warning' ? '⚠️' : ''}
                    ${ ev.level === 'danger' ? '‼️' : ''} <b>( ${ev.level} )</b>
                    <strong>${ev.title}</strong>
                    ${ev.description}`;

            setTimeout(() => sendMessage(msg).then(() => null).catch(() => null), 2000 * idx);
        });
    });

    sunLocator.getStream().subscribe( sunState => {

        if( sunState ){

            let icon = '';

            icon = !!sunState.state && !!~sunState.state.search('day') ? '☀️' : icon;;
            icon = !!sunState.state && !!~sunState.state.search('night') ? '🌙' : icon;
            icon = !!sunState.state && !!~sunState.state.search('gold') ? '🌆' : icon;
            icon = !!sunState.state && !!~sunState.state.search('blue') ? '🏙' : icon;
            icon = !!sunState.state && !!~sunState.state.search('error') ? '‼️' : icon;
            icon = !!sunState.state && !!~sunState.state.search('update') ? '🔄' : icon;

        
            let msg = `Внимание ${icon ? icon : ''} <b>( ${ sunState.state } )</b> <strong>${sunState.title}</strong>${sunState.description}`;

            sendMessage( msg );
        
            sunState.units.forEach((unit, idx) => {
                let msg = `Новый спаун в точке: ${unit.getCoordinatesStr()}<p>${unit.title}</p><p>${unit.description}</p>`;
                setTimeout(() => sendMessage(msg), (idx * 1000));
                // setTimeout(() => sendMessage(unit.getAddressMapString()), (idx * 1000));
                // setTimeout(() => sendPhoto(unit.getPositionImg()), (idx * 1000));
            });

            if(sunState.units.length){
                setTimeout(() => {
                    sendMessage('Взгляните на обновленную карту HG24');
                    UnitController.getAllUnits().then(url => sendPhoto(url));
                },10000)
            }

            const body_state = {
                mode:'add_state',
                login: 'system',
                global_code: sunState.state
            }

            const body_segment = {
                mode:'update',
                segment: 'global',
            }

            fetch('https://hellgame24.ru/hgapi/state/state_handler.php', {
                method: 'POST',
                body:    JSON.stringify(body_state),
                headers: { 'Content-Type': 'application/json' },
            }).then(r => r.text()).then(json=>console.log('result: ', json)).catch(err => console.error(err));

            fetch('https://hellgame24.ru/hgapi/segment/segment_state.php', {
                method: 'POST',
                body:    JSON.stringify(body_segment),
                headers: { 'Content-Type': 'application/json' },
            }).then(r => r.text()).then(json=>console.log('result: ', json)).catch(err => console.error(err))
        }
        console.log('SUN State: ', sunState);


    });

    weather.getStream().subscribe( weatherResult => {
        if( weatherResult && weatherResult.state ){

            let icon = '';

            icon = !!~weatherResult.state.search('clear') ? '☀️' : icon;
            icon = !!~weatherResult.state.search('cloud') ? '☁️' : icon;
            icon = !!~weatherResult.state.search('overcast') ? '🌥' : icon;
            icon = !!~weatherResult.state.search('rain') ? '🌧' : icon;
            icon = !!~weatherResult.state.search('thunder') ? '⛈' : icon;
            icon = !!~weatherResult.state.search('snow') ? '❄️' : icon;
            icon = !!~weatherResult.state.search('error') ? '‼️' : icon;
            icon = !!~weatherResult.state.search('update') ? '🔄' : icon;

            icon = !!~weatherResult.state.search('verycold') ? '❄️' : icon;
            icon = !!~weatherResult.state.search('cold') ? '☃️' : icon;
            icon = !!~weatherResult.state.search('warm') ? '🌤' : icon;
            icon = !!~weatherResult.state.search('hot') ? '☀️' : icon;
            icon = !!~weatherResult.state.search('veryhot') ? '🔥' : icon;

            //console.log('icon:', icon, weatherResult.state);

            setTimeout(() => {
                let msg = weatherResult.state ? `Погода изменилась ${ icon ? icon : ''} <b>( ${ weatherResult.state } )</b>
<strong>${weatherResult.title}</strong>
<p>${weatherResult.description}</p>`: null;

                weatherResult.units.forEach((unit, idx) => {
                    let msg = `Новый спаун в точке: ${unit.getCoordinatesStr()}<p>${unit.title}</p><p>${unit.description}</p>`;
                    setTimeout(() => sendMessage(msg), (idx * 1000));
                    // setTimeout(() => sendMessage(unit.getAddressMapString()), (idx * 1000));
                    // setTimeout(() => sendPhoto(unit.getPositionImg()), (idx * 1000));
                });

                if(msg) sendMessage(msg);
            }, 2000);

            if(weatherResult.units.length){
                setTimeout(() => {
                    sendMessage('Взгляните на обновленную карту HG24');
                    UnitController.getAllUnits().then(url => sendPhoto(url));
                },10000)
            }
        }

    });

    // start bot
    bot.launch().then(() => console.log('bot launched...')).catch(() => null);
}

function sendMessage(msg: string): Promise<any> {
    if(botActiveChats.length) return Promise.all(botActiveChats.map(chat => bot.telegram.sendMessage(chat, msg, {parse_mode:"HTML"})));
    else return Promise.resolve();
}

function sendPhoto(url: string): Promise<any> {
    if(botActiveChats.length) return Promise.all(botActiveChats.map(chat => bot.telegram.sendPhoto(chat, url)));
    else return Promise.resolve();
}

process.on('message', (msg) => {
    if (msg == 'shutdown') {
        console.log('Exiting...');
        setTimeout(function() {
            console.log('Finished exit app bot');
            process.exit(0);
        }, 1500);
    }
});
process.on('SIGINT', ()=>{
    sendMessage('Сервис бота остановлен SIGINT')
        .then((data) => {
            console.log('Сервис бота остановлен SIGINT', data);
            process.exit(0);
        })
        .catch((data) => console.log('Сервис бота остановлен SIGINT', data));
});

process.on('SIGTERM', ()=>{
    sendMessage('Сервис бота остановлен SIGTERM').then((data) => {
        console.log('Сервис бота остановлен SIGTERM', data);
        process.exit(0);
    })
        .catch((data) => console.log('Сервис бота остановлен SIGTERM', data));
});

registrator.start().then(() => initHandlers());
