const Telegraf = require('telegraf');
const HttpsProxyAgent = require('https-proxy-agent');
const fe = require('./fetcher');
const sun = require('./sunlocator');
import { YandexWeather } from './weather';
import fetch from 'node-fetch';
import moment from 'moment';
import { from } from 'rxjs';
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


let token = '776154170:AAELvoF6Tro_C2PMpSfAYit3j0VrZO1-47A';
// HG чат
let hgChatId = -395832167;
// SS личка
//let hgChatId = 474062218;
let version = '0.2.1';
const bot = new Telegraf(token, {
    telegram: {
        // agent: new HttpsProxyAgent({port: '3128', host: '148.217.94.54'})
    }
});

let sunLocator = new sun();
sunLocator.start();

let weather = new YandexWeather();
weather.start();


bot.command('echo', (ctx)=>ctx.reply(ctx.message.text));

bot.hears('check', (ctx, next)=>{
    console.log('check fe:', fetcher);
    ctx.reply('Проверка сервиса version: ' + version + ' последняя запись в event log id: ' + fetcher.lastId + ' интервал опроса HG24: ' + fetcher.interval + 'ms');
    setTimeout(() => ctx.reply('Системное время сервера: ' + moment().format('DD:MM:YYYY HH:mm:ss') ), 3000);
    next();
});

bot.hears('map', (ctx, next)=>{
    console.log('check map...');

    weather.getAllUnits().then(str => {
        ctx.reply('Актуальная карта опасных феноменов Hellgame: ' + str);
    });
    
    next();
});

bot.hears('sun', (ctx, next)=>{

    setTimeout(() => ctx.reply('Ночь: ' + sunLocator.nightTime.format('DD:MM:YYYY HH:mm:ss') + ' День: ' + sunLocator.dayTime.format('DD:MM:YYYY HH:mm:ss')), 1500);
    setTimeout(() => ctx.reply('Утро -  синий час: ' + sunLocator.blueHourMTime.format('DD:MM:YYYY HH:mm:ss') + ' золотой час: ' + sunLocator.goldHourMTime.format('DD:MM:YYYY HH:mm:ss')), 500);
    setTimeout(() => ctx.reply('Вечер - золотой час: ' + sunLocator.goldHourETime.format('DD:MM:YYYY HH:mm:ss') + ' синий час: ' + sunLocator.blueHourETime.format('DD:MM:YYYY HH:mm:ss')), 2500);

    ctx.reply('Интервал обновления состояния: ' + sunLocator.interval + 'ms. Состояние: ' + sunLocator.currentState + ' ( ' + sunLocator.currentStateTitle + ' ) - ' + sunLocator.currentStateDescription);

    setTimeout(() => ctx.reply('Системное время сервера: ' + moment().format('DD:MM:YYYY HH:mm:ss') ), 3000);
    setTimeout(() => ctx.reply('Последнее обновление: ' + sunLocator.lastupdate.format('DD:MM:YYYY HH:mm:ss') ), 4000);
    next();
});

bot.hears('weather', (ctx, next)=>{
    if(weather.raw)
        setTimeout(() => ctx.reply('Неформат.: ' + JSON.stringify(weather.raw), 1500));
    ctx.reply('Интервал обновления состояния: ' + weather.interval + 'ms. Состояние: ' + weather.currentState + ' ( ' + weather.currentStateTitle + ' ) - ' + weather.currentStateDescription);
    setTimeout(() => ctx.reply('Последнее обновление: ' + weather.lastupdate.format('DD:MM:YYYY HH:mm:ss') ), 3000);
    next();
});

bot.start((ctx) => ctx.reply('Hello'));

bot.on('message', (ctx) => {
    console.log('message...:', ctx.update.message.text );
    console.log(ctx.update.message.chat);
    console.log(ctx.update.message.from);
});

if(hgChatId) bot.telegram.sendMessage(hgChatId, 'Сервис бота успешно запущен');

bot.launch();


process.on('SIGINT', ()=>{
    bot.telegram.sendMessage(hgChatId, 'Сервис бота остановлен').finally(()=>process.exit());
});

// запускаем fetcher событий на hg24
let fetcher = new fe('http://hellgame24.ru');
fetcher.getStream().subscribe( events => {
    if( events && events.length ) events.forEach((ev, idx) => {
        setTimeout(()=>{
          let msg = `Событие ${ ev.level === 'info' ? 'ℹ️' : ''}${ ev.level === 'warning' ? '⚠️' : ''}${ ev.level === 'danger' ? '‼️' : ''} <b>( ${ev.level} )</b>
<strong>${ev.title}</strong>
${ev.description}`;

          //console.log('msg:', msg);
          bot.telegram.sendMessage(hgChatId, msg,
          {parse_mode:"HTML"});
        }, 2000 * idx);
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

      setTimeout(() => {
        let msg = `Внимание ${icon ? icon : ''} <b>( ${ sunState.state } )</b>
<strong>${sunState.title}</strong>
${sunState.description}`;

        bot.telegram.sendMessage(hgChatId, msg, {parse_mode:"HTML"});
      }, 2000);

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
    let msg = `Погода изменилась ${ icon ? icon : ''} <b>( ${ weatherResult.state } )</b>
<strong>${weatherResult.title}</strong>
${weatherResult.description}`;

      msg = weatherResult.position ? msg + `
      Новый спаун в точке
      ${ weatherResult.img ? weatherResult.img : '' }

      Открыть на карте: ${ weatherResult.position ? weatherResult.position : '' }` : msg;

      if (weatherResult.position) weather.getAllUnits().then(msg => bot.telegram.sendMessage(hgChatId, 'Актуальная карта опасных явлений HG24: ' + msg));

    bot.telegram.sendMessage(hgChatId, msg,
    {parse_mode:"HTML"});
  }, 2000);
  }

});
