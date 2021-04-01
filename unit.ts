import fetch from 'node-fetch';
import { MONSTERS } from './monsters_repo';

const mapbox_token = 'pk.eyJ1IjoiZXhjbHVzaXZlbG9naW4iLCJhIjoiY2p2d2R0eDlxMXRldTRhbXM2dHAzdzhhdCJ9.w_mBqjrTK6ycIB0OViaw_g';

// syzran
const lat = 53.148212;
const lng = 48.454170;

export class Unit {
    lat: number;
    lng: number;
    title: string;
    description: string;
    level = 0;
    class = 'blinker';

    constructor(lat: number, lng: number, title: string = 'unknown', description: string = '...'){
        this.lat = lat;
        this.lng = lng;
        this.title = title;
        this.description = description;
    }

    getPositionImg(): string {
        return `https://api.mapbox.com/styles/v1/mapbox/light-v10/static/pin-l-danger+900(${this.lng},${this.lat})/${this.lng},${this.lat},13/800x600?access_token=${mapbox_token}`;
    }

    getAddressMapString(): string {
        let base = 'https://www.google.com/maps/search/?api=1&query=';
        return base + [this.lat, this.lng].join(',');
    }

    getCoordinatesStr(): string {
        return `Широта: ${this.lat}, Долгота: ${this.lng}`;
    } 
}

export class UnitController {
    
    static createRandomUnit(): Unit {
        const idx = this.getRandomInt(MONSTERS.length) - 1;
        const monster = MONSTERS[idx];

        const position = this.getRandomPosition();
        this.addUnitData(...position, monster.title, monster.description);
        return new Unit(...position, monster.title, monster.description);
    }
 
    static getRandomPosition(): [number, number] {
        const latMin = 53.05;
        const latMax = 53.2;
    
        const lngMin = 48.3;
        const lngMax = 48.58;
    
        let lat = Math.random() * (latMax - latMin) + latMin;
        let lng = Math.random() * (lngMax - lngMin) + lngMin;
    
        return [lat, lng];
    }
    
    static getSummaryUnitsMapImgURL(geojson): string {
        return `https://api.mapbox.com/styles/v1/mapbox/light-v10/static/geojson(${geojson})/${lng + ',' + lat},10/1000x1000?access_token=${mapbox_token}`;
    }

    static geoJSONPointsGenerator(coordinates: [number, number][]): string {
        const pattern = {
          type: "FeatureCollection",
          features: []
        }
    
        const featurePattern = {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": null
          },
          "properties": null,
    
        }
    
        const prop = {
          "marker-size": "medium",
          "marker-symbol": "danger",
          "marker-color": "#F00"
        }
    
        pattern.features = coordinates.map(c => {
          featurePattern.geometry.coordinates = c;
          featurePattern.properties = prop;
          return JSON.parse(JSON.stringify(featurePattern));
        })
    
        return encodeURIComponent(JSON.stringify(pattern))
    }

    static getRandomInt(max) {
        return Math.floor(Math.random() * max);
    }

    static addUnitData(lat: number, lon: number, title: string, description: string): void {

        const body = {
          mode: "add_unit",
          name: title,
          description,
          lat: lat.toString(),
          lng: lon.toString(),
        };
      
        console.log('add json:', body);
        fetch(`https://hellgame24.ru/hgapi/units/units_handler.php`, { method: 'POST', body: JSON.stringify(body) })
          .then(response => !!response && response.json())
          .then(json => console.log('AddUnit Result:', json))
          .catch(error => console.log('addUnitData error: ', error));
      }
    
    static removeAllUnits(): void {
        console.log('Removing All Units:');
        const body = {
            operation: 'remove_all'
        };
        fetch(`https://hellgame24.ru/hgapi/units/units_handler.php`, { method: 'POST', body: JSON.stringify(body) })
            .then(response => !!response && response.json())
            .then(json => console.log('removeAllUnits Result:', json))
            .catch(error => console.log('removeAllUnits error: ', error));
    }

    static getAllUnits(): Promise<string> {
        return fetch(`https://hellgame24.ru/hgapi/units/units_handler.php?mode=get_all_units`)
            .then(response => response ? response.json() : [])
            .then(json => {
            // console.log('active Units Result:', json);

            json = (json as {lat: string, lng: string}[]).filter(unit => unit.lat && unit.lng).map(unit => ([+unit.lng, +unit.lat]));

            return this.getSummaryUnitsMapImgURL(this.geoJSONPointsGenerator(json)); 
            })
            .catch(error => {
                console.log('getAllUnits error: ', error);
                return error;
            });
        }
}