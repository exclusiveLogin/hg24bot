import fetch from 'node-fetch';
import moment, { Moment } from 'moment';
import { BehaviorSubject, from } from 'rxjs';
import { Unit, UnitController } from './unit';

export interface WeatherData{
  state: string;
  title: string;
  description: string;
  units: Unit[];
}
// syzran
const lat = 53.148212;
const lng = 48.454170;
export class YandexWeather {

  lock = true;
  raw: any;
  lastupdate: Moment;
  interval: number;
  timer: NodeJS.Timeout;
  stream$ = new BehaviorSubject<WeatherData>(null);
  token = 'f47ace45-e3af-4a34-bde1-02b717601007';
  tokenName = 'X-Yandex-API-Key';
  currentState: string;
  prevState: string;
  currentTemp: number;
  prevTemp: number;
  currentStateTitle: string;
  currentStateDescription: string;

  constructor(interval = 3600000) {
    this.interval = interval;
  }

  start() {

    setTimeout(() => this.lock = false, 60000);

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
      let data: WeatherData;

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


      let title = 'Температура воздуха: ' + this.currentTemp + ' C \n';
      title = relationStr ? title + relationStr : title;
      const description = 'Ощущается как ' + feel + ' C';

      data = {
        state,
        title,
        description,
        units: []
      }

      if(state === 'cold' || state === 'hot') {
        data.units.push(UnitController.createRandomUnit())
      }

      if(state === 'verycold' || state === 'veryhot') {
        data.units.push(UnitController.createRandomUnit(), UnitController.createRandomUnit(), UnitController.createRandomUnit());
      }

      this.stream$.next(data);
      this.prevTemp = this.currentTemp;
    }
  }

  calcCurrentState(condition) {

    console.log('calcCurrentState...', condition, ' old: ', this.currentState);

    this.currentState = condition;
    let newSpawnCountBlinker = 0;
  
    if (this.currentState === 'clear') {
      this.currentStateTitle = "Ясно";
      this.currentStateDescription = "Все спауны чистые, блуждающие уничтожены";
    }

    if (this.currentState === 'partly-cloudy') {
      this.currentStateTitle = "малооблачно";
      this.currentStateDescription = "Могут быть короткие спауны блинкеров вблизи аномальных зон";
      newSpawnCountBlinker = 1;
    }

    if (this.currentState === 'cloudy') {
      this.currentStateTitle = "облачно с прояснениями";
      this.currentStateDescription = "Мир ВМ частично закрыл границы";
      newSpawnCountBlinker = 1;
    }

    if (this.currentState === 'overcast') {
      this.currentStateTitle = "пасмурно";
      this.currentStateDescription = "Мир ВМ полностью закрыл границы";
      newSpawnCountBlinker = 1;
    }

    if (this.currentState === 'partly-cloudy-and-light-rain') {
      this.currentStateTitle = "небольшой дождь";
      this.currentStateDescription = "FALLOUT, слабые выпадения, вероятно легкое поражение, спауны ВМ агентов вблизи зон";
      newSpawnCountBlinker = 2;
    }

    if (this.currentState === 'partly-cloudy-and-rain') {
      this.currentStateTitle = "дождь";
      this.currentStateDescription = "FALLOUT, сильные выпадения, спауны ВМ агентов вблизи зон и городов. Значительное поражение на улице";
      newSpawnCountBlinker = 1;
    }

    if (this.currentState === 'overcast-and-rain') {
      this.currentStateTitle = "сильный дождь";
      this.currentStateDescription = "FALLOUT, мощные выпадения, спауны ВМ агентов повсюду. На улицу не выходить";
      newSpawnCountBlinker = 2;
    }

    if (this.currentState === 'overcast-thunderstorms-with-rain') {
      this.currentStateTitle = "сильный дождь, гроза";
      this.currentStateDescription = "Мощные спауны ВМ и НМ , активация зон повсюды, активация линий сборок, На улице жатва и поиск новой крови и плоти.";
      newSpawnCountBlinker = 3;
    }

    if (this.currentState === 'cloudy-and-light-rain') {
      this.currentStateTitle = "Облачно, небольшой дождь";
      this.currentStateDescription = "Купол + легкая атака выпадениями";
      newSpawnCountBlinker = 2;
    }

    if (this.currentState === 'overcast-and-light-rain') {
      this.currentStateTitle = "Купол + легкая атака выпадениями с спауном в зонах";
      this.currentStateDescription = "...";
      newSpawnCountBlinker = 1;
    }

    if (this.currentState === 'cloudy-and-rain') {
      this.currentStateTitle = "Облачно, небольшой дождь";
      this.currentStateDescription = "Купол, атака с неба.";
      newSpawnCountBlinker = 1;
    }

    if (this.currentState === 'overcast-and-wet-snow') {
      this.currentStateTitle = "дождь со снегом";
      this.currentStateDescription = "...";
      newSpawnCountBlinker = 2;
    }

    if (this.currentState === 'partly-cloudy-and-light-snow') {
      this.currentStateTitle = "небольшой снег";
      this.currentStateDescription = "...";
      newSpawnCountBlinker = 1;
    }

    if (this.currentState === 'partly-cloudy-and-snow') {
      this.currentStateTitle = "снег";
      this.currentStateDescription = "...";
      newSpawnCountBlinker = 1;
    }

    if (this.currentState === 'overcast-and-snow') {
      this.currentStateTitle = "снегопад";
      this.currentStateDescription = "...";
      newSpawnCountBlinker = 1;
    }

    if (this.currentState === 'cloudy-and-light-snow') {
      this.currentStateTitle = "небольшой снег";
      this.currentStateDescription = "...";
      newSpawnCountBlinker = 1;
    }

    if (this.currentState === 'overcast-and-light-snow') {
      this.currentStateTitle = "небольшой снег";
      this.currentStateDescription = "...";
      newSpawnCountBlinker = 1;
    }

    if (this.currentState === 'cloudy-and-snow') {
      this.currentStateTitle = "облачно и снег";
      this.currentStateDescription = "...";
      newSpawnCountBlinker = 2;
    }

    const units = [];
    
    let data: WeatherData = {
      state: null,
      description: this.currentStateDescription,
      title: this.currentStateTitle,
      units,
    };
    

    

    if (this.currentState !== this.prevState) {

      if (newSpawnCountBlinker) {
        for(let i = 0; i < newSpawnCountBlinker; i++){
          data.units.push(UnitController.createRandomUnit());
        }
      }

      if (this.currentState === 'clear' && !this.lock) {
        UnitController.removeAllUnits();
      }

      data.state = this.currentState;
      
      this.prevState = this.currentState;
    }

    this.stream$.next(data);
  }

  getStream() {
    return this.stream$;
  }

  fetchData() {
    fetch(`https://api.weather.yandex.ru/v1/informers?lat=${lat}&lon=${lng}`, { headers: {[this.tokenName]: this.token} })
      .then(response => !!response && response.json())
      .then(json => !!json && this.remapData(json))
      .catch(error => {
        console.log('sunrise error: ', error);
        setTimeout(() => this.fetchData(), 30000);
      });
  }
}
