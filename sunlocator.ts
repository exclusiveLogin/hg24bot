import fetch from 'node-fetch';
import moment from 'moment';
import { BehaviorSubject, Observable } from 'rxjs';
import { Unit, UnitController } from './unit';

export interface SunData{
    state: string;
    title: string;
    description: string;
    units: Unit[];
}
// syzran
const lat = 53.148212;
const lng = 48.454170;

class SunLocator{

    raw = null;
    lastupdate = null;

    timer: NodeJS.Timeout;
    timerupd: NodeJS.Timeout;

    interval = 10000;
    intervalUpdate = 3600000;
    lock = true;
    // this.onceFetch = true;
    stream$ = new BehaviorSubject<SunData>(null);

    // Current state
    currentState;
    currentStateTitle;
    currentStateDescription;

    // Prev state
    prevState;
    prevStateTitle;
    prevStateDescription;

    // DAY PARTS FLAGS
    nightFlag;
    blueHourMFlag;
    goldHourMFlag;
    dayFlag;
    goldHourEFlag;
    blueHourEFlag;

    // DAY MAP
    nightTime;
    blueHourMTime;
    goldHourMTime;
    dayTime;
    goldHourETime;
    blueHourETime;
    blueHourMTimeNext;

    constructor( interval, upd ){
        this.interval = interval || 10000;
        this.intervalUpdate = upd || 3600000;
    }

    start(){

        setTimeout(() => this.lock = false, 60000);

        this.fetchSunData();
        if( this.timer ){
            clearInterval(this.timer);
            delete this.timer;
        }
        this.timer = setInterval( () => this.calcCurrentState(), this.interval);

        if( this.timerupd ){
          clearInterval(this.timerupd);
          delete this.timerupd;
      }
      this.timerupd = setInterval( () => this.fetchSunData(), this.intervalUpdate);
    }

    stop(){
        this.timer && clearInterval(this.timer);
        delete this.timer;

        this.timerupd && clearInterval(this.timerupd);
        delete this.timerupd;
    }

    remapTime( r ){

        this.raw = r;
        this.lastupdate = moment();
        // переход из ночи в синий час
        this.blueHourMTime = moment( r.civil_twilight_begin );

        // переход из синего часа в ночь
        this.nightTime = moment( r.civil_twilight_end );

        // переход из синего часа в золотой (утро)
        this.goldHourMTime = moment( r.sunrise );

        // переход из золотого часа в синий (вечер)
        this.blueHourETime = moment( r.sunset );

        // переход на сл сутки синий час
        this.blueHourMTimeNext = moment( r.sunset ).add(1, 'd');

        // Длины золотого и синего часов(минуты)
        const blueDiff = this.goldHourMTime.diff( this.blueHourMTime, 'm' );
        const goldDiff = blueDiff + 10;

        // Переход из золотого часа в день
        this.dayTime = this.goldHourMTime.clone().add( goldDiff, 'm' );

        // Переход из дня в золотой час (вечер)
        this.goldHourETime = this.blueHourETime.clone().subtract( goldDiff, 'm');

        //this.stream$.next({state: 'update', title: 'Обновление данных о солнце', description: 'Системное обновление успешно завершено'});

        //this.calcCurrentState();
    }

    calcCurrentState(){

        if(!this.raw) return;

        let currentTime = moment();

        // блок обновления суточных данных по солнцу
        // let startDate = currentTime.clone().set({'hour':1, 'minute': 0, 'second': 0, 'millisecond': 0});
        // let endDate = startDate.clone().add( 20, 's' );
        // let untriggerDate = startDate.clone().add( 1, 'h' );

        // if( currentTime.isBetween( startDate, endDate ) && !!this.onceFetch ) {
        //   console.log('current time between update interval');
        //     this.fetchSunData();
        //     return;
        // }

        // if( currentTime.isAfter( untriggerDate ) && !this.onceFetch ) {
        //   this.onceFetch = true;
        //   console.log('Снятие блокировки на обновление');
        // }


        this.nightFlag = currentTime.isBefore( this.blueHourMTime ) || currentTime.isBetween( this.nightTime, this.blueHourMTimeNext );
        this.blueHourMFlag = currentTime.isBetween( this.blueHourMTime, this.goldHourMTime );
        this.goldHourMFlag = currentTime.isBetween( this.goldHourMTime, this.dayTime );
        this.dayFlag = currentTime.isBetween( this.dayTime, this.goldHourETime );
        this.goldHourEFlag = currentTime.isBetween( this.goldHourETime, this.blueHourETime );
        this.blueHourEFlag = currentTime.isBetween( this.blueHourETime, this.nightTime );

        let newSpawnCountBlinker = 0;

        if( this.nightFlag ) {
            this.currentState = 'night';
            this.currentStateTitle = "Ночь";
            this.currentStateDescription = "Время темных сил";
            newSpawnCountBlinker = 3;
        }

        if( this.blueHourMFlag ) {
            this.currentState = 'blue_m';
            this.currentStateTitle = "Утренний синий час";
            this.currentStateDescription = "Время последнего прорыва ВМ";
            newSpawnCountBlinker = 2
        }

        if( this.blueHourEFlag ) {
            this.currentState = 'blue_e';
            this.currentStateTitle = "Вечерний синий час";
            this.currentStateDescription = "Время прихода ВМ";
            newSpawnCountBlinker = 2;
        }

        if( this.dayFlag ) {
            this.currentState = 'day';
            this.currentStateTitle = "День";
            this.currentStateDescription = "Время относительно безопасное, если нет других условий, блуждающие уничтожены";
        }

        if( this.goldHourMFlag ) {
            this.currentState = 'gold_m';
            this.currentStateTitle = "Утренний золотой час";
            this.currentStateDescription = "Время последнего прорыва НМ";
            newSpawnCountBlinker = 1;
        }

        if( this.goldHourEFlag ) {
            this.currentState = 'gold_e';
            this.currentStateTitle = "Вечерний золотой час";
            this.currentStateDescription = "Время прихода НМ";
            newSpawnCountBlinker = 1;
        }

        if( !(this.nightFlag || this.blueHourMFlag || this.blueHourEFlag || this.dayFlag || this.goldHourMFlag || this.goldHourEFlag)){
            this.currentState = null;
            this.currentStateTitle = "Не определено";
            this.currentStateDescription = "Что то пошло не так";
        }

        if( this.currentState !== this.prevState ){

            if (this.currentState === 'day' && !this.lock) {
                UnitController.removeAllUnits();
            }

            let data: SunData = {
                state: this.currentState,
                title: this.currentStateTitle,
                description: this.currentStateDescription,
                units: [],
            };
            
            if (newSpawnCountBlinker) {
                for(let i = 0; i < newSpawnCountBlinker; i++){
                  data.units.push(UnitController.createRandomUnit());
                }
              }

            this.stream$.next( data );

            this.prevState = this.currentState
            this.prevStateTitle = this.currentStateTitle;
            this.prevStateDescription = this.currentStateDescription;

        }

    }

    getStream(): Observable<SunData> {
        return this.stream$.pipe();
    }

    fetchSunData(){
      console.log('fetching sun data');
      fetch(`https://api.sunrise-sunset.org/json?lat=${lat}&lng=${lng}&formatted=0`)
        .then( response => !!response && response.json())
        .then( json => {
          console.log('fetched data complete');
          if( !!json && json.results ) this.remapTime( json.results );
        } )
        .catch( error => {
            console.log('sunrise error: ', error);
            //при ошибке делаем попытку через 30 сек
            setTimeout(() => this.fetchSunData(), 30000);
            this.stream$.next({state: 'error', title: 'Обновление данных о солнце', description: 'Системное обновление завершено c ошибкой:' + JSON.stringify( error ), units: []});
        });
    }
}

module.exports = SunLocator;
