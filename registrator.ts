import fetch from 'node-fetch';
import { BehaviorSubject } from 'rxjs';
import {Context} from "telegraf";

export class Registrator{
    url: string;
    stream$ = new BehaviorSubject([]);
    path: string;

    constructor(url){
        this.url = url;
        this.path = this.url+'/hgapi/bot/registration_handler.php';
    }

    getStream(){
        return this.stream$.asObservable();
    }

    start(): Promise<any> {
        return this.init();
    }
    init(): Promise<any> {
        return fetch(`${this.path}?mode=get_active_registrations`)
            .then(response => !!response && response.json())
            .then(data => {
                console.log('active registrations fetch data: ', data);
                this.stream$.next(data.map(d => d.chat_id));
            })
            .catch(error => {
                console.log('active registrations fetch error: ', error);
                return null;
            });
    }

    addRegistration(ctx: Context): Promise<any> {
        console.log('addRegistration id: ', ctx.message.chat.id);
        const body = {
            operation: 'add_registration',
            chat_id: ctx.message.chat.id,
            username: ctx.message.from.username,
        };

        return this.fetchPostData(body).then(() => ctx.message.chat.id);
    }

    unRegistration(ctx: Context): Promise<any>  {
        const body = {
            operation: 'deactivate_registration',
            chat_id: ctx.message.chat.id,
            username: ctx.message.from.username,
        };

        return this.fetchPostData(body).then(() => ctx.message.chat.id);
    }

    fetchPostData(data: any): Promise<void> {
        const h: HeadersInit = {
            'Content-Type': 'application/json; charset=UTF-8'
        }
        return fetch(`${this.path}`, { method: 'POST', body: JSON.stringify(data), headers: h })
            .then(response => !!response && response.json())
            .then(data => console.log('add registrations fetch data: ', data))
            .catch(error => console.log('add registrations fetch error: ', error));
    }

}
