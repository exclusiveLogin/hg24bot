import fetch from 'node-fetch';
import moment, { Moment } from 'moment';
import { BehaviorSubject } from 'rxjs';

// syzran
const lat = 53.148212;
const lng = 48.454170;

class YandexWeather {

  raw: any;
  lastupdate: Moment;
  interval: number;
  timer: NodeJS.Timeout;
  stream$ = new BehaviorSubject(null);
  token = 'f47ace45-e3af-4a34-bde1-02b717601007';
  mapbox_token = 'pk.eyJ1IjoiZXhjbHVzaXZlbG9naW4iLCJhIjoiY2p2d2R0eDlxMXRldTRhbXM2dHAzdzhhdCJ9.w_mBqjrTK6ycIB0OViaw_g';
  tokenName = 'X-Yandex-API-Key';
  currentState: string;
  prevState: string;
  currentTemp: number;
  prevTemp: number;
  currentStateTitle: string;
  currentStateDescription: string;

  constructor(interval) {
    this.interval = interval || 3600000;
  }

  start() {
    this.fetchData();
    if (this.timer) {
      clearInterval(this.timer);
      delete this.timer;
    }
    this.timer = setInterval(() => this.fetchData(), this.interval);
  }

  stop() {
    this.timer && clearInterval(this.timer);
    delete this.timer;
  }

  remapData(r) {
    this.raw = r;
    this.lastupdate = moment();

    if (!!r && !!r.fact && !!r.fact.condition) {
      setTimeout(() => this.calcCurrentState(r.fact.condition), 3000);
    }

    if (!!r && !!r.fact && !!r.fact.temp) {
      setTimeout(() => this.calcTempState(r.fact.temp, r.fact.feels_like), 5000);
    }

  }

  calcTempState(temperature, feel) {
    this.currentTemp = Number(temperature);

    if (this.currentTemp !== this.prevTemp) {
      let data: { [key: string]: any } = {};

      debugger;

      let relationSum;
      let relation;
      let relationStr;

      if (this.currentTemp && this.prevTemp) {
        relationSum = Number(this.currentTemp) - Number(this.prevTemp)
        relation = (relationSum) > 0 ? 'выше' : 'ниже';
        relationStr = ' - на ' + Math.abs(relationSum) + ' ' + relation + ' чем было ( ' + this.prevTemp + ' )';
      }

      let state;
      state = this.currentTemp && Number(this.currentTemp) < -10 ? 'verycold' : state;
      state = !state && this.currentTemp && Number(this.currentTemp) < 0 && Number(this.currentTemp) >= -10 ? 'cold' : state;
      state = !state && this.currentTemp && Number(this.currentTemp) < 20 && Number(this.currentTemp) >= 0 ? 'warm' : state;
      state = !state && this.currentTemp && Number(this.currentTemp) < 30 && Number(this.currentTemp) >= 20 ? 'hot' : state;
      state = !state && this.currentTemp && Number(this.currentTemp) >= 30 ? 'veryhot' : state;


      data.state = state;
      data.title = 'Температура воздуха: ' + this.currentTemp + ' C \n';
      data.title = relationStr ? data.title + relationStr : data.title;
      data.description = 'Ощущается как ' + feel + ' C';
      this.stream$.next(data);
      this.prevTemp = this.currentTemp;
    }
  }

  getRandomPosition() {
    const latMin = 53.05;
    const latMax = 53.2;

    const lngMin = 48.3;
    const lngMax = 48.58;

    let lat = Math.random() * (latMax - latMin) + latMin;
    let lng = Math.random() * (lngMax - lngMin) + lngMin;

    return [lat, lng];
  }

  getAddressMapString(position) {

    if (!(position && position.length > 1)) return;
    let base = 'https://www.google.com/maps/search/?api=1&query=';

    return base + position.join(',');
  }

  getPositionImg(position) {
    return position && position.length > 1 ? 
    `https://api.mapbox.com/styles/v1/mapbox/light-v10/static/pin-l-danger+900(${position[1] + ',' + position[0]})/${position[1] + ',' + position[0]},13/800x600?access_token=${this.mapbox_token}` : 
    null;
  }

  calcCurrentState(condition) {

    this.currentState = condition;

    // Код расшифровки погодного описания. Возможные значения:
    // clear — ясно.
    // partly-cloudy — малооблачно.
    // cloudy — облачно с прояснениями.
    // overcast — пасмурно.
    // partly-cloudy-and-light-rain — небольшой дождь.
    // partly-cloudy-and-rain — дождь.
    // overcast-and-rain — сильный дождь.
    // overcast-thunderstorms-with-rain — сильный дождь, гроза.
    // cloudy-and-light-rain — небольшой дождь.
    // overcast-and-light-rain — небольшой дождь.
    // cloudy-and-rain — дождь.
    // overcast-and-wet-snow — дождь со снегом.
    // partly-cloudy-and-light-snow — небольшой снег.
    // partly-cloudy-and-snow — снег.
    // overcast-and-snow — снегопад.
    // cloudy-and-light-snow — небольшой снег.
    // overcast-and-light-snow — небольшой снег.
    // cloudy-and-snow — снег.
    let newSpawn;

    let randomPos = this.getRandomPosition();
    let posImg = this.getPositionImg(randomPos);

    if (this.currentState === 'clear') {
      this.currentStateTitle = "Ясно";
      this.currentStateDescription = "Все спауны чистые, блуждающие уничтожены";
    }

    if (this.currentState === 'partly-cloudy') {
      this.currentStateTitle = "малооблачно";
      this.currentStateDescription = "Могут быть короткие спауны блинкеров вблизи аномальных зон";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'cloudy') {
      this.currentStateTitle = "облачно с прояснениями";
      this.currentStateDescription = "Мир ВМ частично закрыл границы";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'overcast') {
      this.currentStateTitle = "пасмурно";
      this.currentStateDescription = "Мир ВМ полностью закрыл границы";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'partly-cloudy-and-light-rain') {
      this.currentStateTitle = "небольшой дождь";
      this.currentStateDescription = "FALLOUT, слабые выпадения, вероятно легкое поражение, спауны ВМ агентов вблизи зон";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'partly-cloudy-and-rain') {
      this.currentStateTitle = "дождь";
      this.currentStateDescription = "FALLOUT, сильные выпадения, спауны ВМ агентов вблизи зон и городов. Значительное поражение на улице";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'overcast-and-rain') {
      this.currentStateTitle = "сильный дождь";
      this.currentStateDescription = "FALLOUT, мощные выпадения, спауны ВМ агентов повсюду. На улицу не выходить";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'overcast-thunderstorms-with-rain') {
      this.currentStateTitle = "сильный дождь, гроза";
      this.currentStateDescription = "Мощные спауны ВМ и НМ , активация зон повсюды, активация линий сборок, На улице жатва и поиск новой крови и плоти.";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'cloudy-and-light-rain') {
      this.currentStateTitle = "Облачно, небольшой дождь";
      this.currentStateDescription = "Купол + легкая атака выпадениями";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'overcast-and-light-rain') {
      this.currentStateTitle = "Купол + легкая атака выпадениями с спауном в зонах";
      this.currentStateDescription = "...";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'cloudy-and-rain') {
      this.currentStateTitle = "Облачно, небольшой дождь";
      this.currentStateDescription = "Купол, атака с неба.";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'overcast-and-wet-snow') {
      this.currentStateTitle = "дождь со снегом";
      this.currentStateDescription = "...";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'partly-cloudy-and-light-snow') {
      this.currentStateTitle = "небольшой снег";
      this.currentStateDescription = "...";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'partly-cloudy-and-snow') {
      this.currentStateTitle = "снег";
      this.currentStateDescription = "...";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'overcast-and-snow') {
      this.currentStateTitle = "снегопад";
      this.currentStateDescription = "...";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'cloudy-and-light-snow') {
      this.currentStateTitle = "небольшой снег";
      this.currentStateDescription = "...";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'overcast-and-light-snow') {
      this.currentStateTitle = "небольшой снег";
      this.currentStateDescription = "...";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState === 'cloudy-and-snow') {
      this.currentStateTitle = "облачно и снег";
      this.currentStateDescription = "...";
      newSpawn = this.getAddressMapString(randomPos);
    }

    if (this.currentState !== this.prevState) {
      let data: {[key: string]: any} = {};
      data.state = this.currentState;
      data.title = this.currentStateTitle;
      data.description = this.currentStateDescription;
      data.position = newSpawn ? newSpawn : null;
      data.img = data.position ? posImg : null;
      this.stream$.next(data);
      this.prevState = this.currentState;
    }

  }

  getStream() {
    return this.stream$;
  }

  fetchData() {
    let h = new fetch.Headers();
    h.append(this.tokenName, this.token);
    fetch(`https://api.weather.yandex.ru/v1/informers?lat=${lat}&lon=${lng}`, { headers: h })
      .then(response => !!response && response.json())
      .then(json => !!json && this.remapData(json))
      .catch(error => {
        console.log('sunrise error: ', error);
        setTimeout(() => this.fetchData(), 30000);
      });
  }
}

module.exports = YandexWeather;
