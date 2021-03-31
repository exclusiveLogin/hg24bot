import fetch from 'node-fetch';
import { BehaviorSubject } from 'rxjs';

export interface UXEventResponse {
    id: string;
    title: string;
    description: string;
    level: string;
    author: string;
    segment: string;
    desktop_notify: string;
    push_notify: string;
    telegram_notify: string;
    img: string;
    datetime: string;
}

export interface IUXEvent {
    id: number;
    title: string;
    description: string;
    level: string;
    author: string;
    segment: string;
    desktop_notify: boolean;
    push_notify: boolean;
    telegram_notify: boolean;
    img: string;
    datetime: string;
}

export class UXEvent implements IUXEvent {
    id: number;
    title: string;
    description: string;
    level: string;
    author: string;
    segment: string;
    desktop_notify: boolean;
    push_notify: boolean;
    telegram_notify: boolean;
    img: string;
    datetime: string;

    constructor(json: UXEventResponse){
        this.id = +json.id;
        this.title = json.title;
        this.description = json.description;
        this.level = json.level;
        this.author = json.author;
        this.segment = json.segment;
        this.desktop_notify = !!json.desktop_notify;
        this.push_notify = !!json.push_notify;
        this.telegram_notify = !!json.telegram_notify;
        this.img = json.img;
        this.datetime = json.datetime;
    }
}

class EventFetcher{
    url: string;
    interval: number;
    level: string;
    stream$ = new BehaviorSubject<UXEvent[]>([]);
    timer: NodeJS.Timeout;
    lastId: number;
    
    constructor(url, interval = 5000, level = 'global'){
        this.url = url;
        this.interval = interval;
        this.level = level;
        this.init();
    }

    start(){
      this.stop();
      this.timer = setInterval(()=>this.update(), this.interval);
    }

    stop(){
      if( this.timer ){
        clearInterval( this.timer );
        delete this.timer;
      }
    }

    getStream(){
        return this.stream$.asObservable();
    }

    init(){
        let path = this.url+'/hgapi/events/events_handler.php?mode=get_last_event';

        fetch( path ,{ method:'get'}).then( result => {
            if(result.ok) return result.json();
        }).then(json => {
            console.log('fetched last event:', json);
            this.lastId = json && json.length && json[0].id;
            console.log('last event id:', this.lastId);
            this.start();
        }).catch(e=>{
            console.error(e);
            setTimeout(()=>{this.init()},30000);
        });
    }

    update(){
        
        if( !this.lastId ) return;

        let path = this.url+'/hgapi/events/events_handler.php?mode=get_new_events&id='+this.lastId;

        fetch( path ,{ method:'get'}).then( result => {
            if(result.ok) return result.json();
        }).then(json => {
                        
            let last = json && json.slice(-1);
            let newId = last && !!last.length && last[0].id;

            if(newId) {
                this.lastId = newId;
                console.log('New event id:', newId);
            }

            this.stream$.next( json );
        }).catch(e=> {
            console.error(e);
        });

    }
}

module.exports = EventFetcher;
