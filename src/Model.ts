import { $ } from "./jquery-lib";
import { ApiService } from "./equal-services";

import View from "./View";
import Layout from "./Layout";

/**
 * Class for Model intercations
 * Acts like server-side Collection.class.php
 */
export class Model {

    private view: View;
    
    // Collection (array) of objects (we use array to maintain objects order)
    private objects: any[];

    // Map for keeping track of the fields that have been changed, on an object basis (keys are objects ids)
    private has_changed: any;

    // total objects matching the current domain on the back-end
    private total: number;

    private loaded_promise: any;


    
    // Collecitons do not deal with lang: it is used in ApiService set in the environment var
    
    constructor(view:View) {
        this.view = view;

        this.loaded_promise = $.Deferred();

        this.has_changed = {};
        this.objects = [];
        this.total = 0;
    }
    

    public async init() {        
        try {            
            await this.refresh();
        }
        catch(err) {
            console.log('Something went wrong ', err);
        }
    }

    private deepCopy(obj:any):any {
        var copy:any;
    
        // Handle the 3 simple types, and null or undefined
        if (null == obj || "object" != typeof obj) return obj;
    
        // Handle Date
        if (obj instanceof Date) {
            copy = new Date();
            copy.setTime(obj.getTime());
            return copy;
        }
    
        // Handle Array
        if (obj instanceof Array) {
            copy = [];
            for (var i = 0, len = obj.length; i < len; i++) {
                copy[i] = this.deepCopy(obj[i]);
            }
            return copy;
        }
    
        // Handle Object
        if (obj instanceof Object) {
            copy = {};
            for (var attr in obj) {
                if (obj.hasOwnProperty(attr)) copy[attr] = this.deepCopy(obj[attr]);
            }
            return copy;
        }
    
        throw new Error("Unable to copy obj! Its type isn't supported.");
    }

    /**
     * Resolve the final type of a given field (handling 'alias' and 'computed').
     * 
     * @param field 
     * @returns string The final type. If final type cannot be resolved, the 'string' type is returned as default.
     */
    public getFinalType(field:string) {
        let result = 'string';
        let schema = this.view.getModelFields();
        
        while(schema.hasOwnProperty(field) && schema[field].hasOwnProperty('type') && schema[field].type == 'alias' && schema[field].hasOwnProperty('alias')) {
            field = schema[field].alias;
        }
        if(schema.hasOwnProperty(field) && schema[field].hasOwnProperty('type')) {
            if(schema[field].type == 'computed') {
                if(schema[field].hasOwnProperty('result_type')) {
                    result = schema[field].result_type;
                }
            }
            else {
                result = schema[field].type;
            }            
        }
        return result;
    }

    public getOperators(type:string) {
        let operators:any = {
            'boolean':      ['=', '<>'],
            'integer':      ['in', 'not in', '=', '<>', '<', '>', '<=', '>='],
            'float':        ['=', '<>', '<', '>', '<=', '>='],
            'string':       ['like', 'in', '=', '<>'],
            'text':         ['like', '='],
            'date':         ['=', '<=', '>='],
            'time':         ['=', '<=', '>='],
            'datetime':     ['=', '<=', '>='],
            'file':         ['like', '='],
            'binary':       ['like', '='],
            'many2one':     ['=', 'is', 'in', 'not in'],
            'one2many':     ['contains'],
            'many2many':    ['contains']
        };
        return operators[type];
    }

    public hasChanged() : boolean {
        return (Object.keys(this.has_changed).length > 0);
    }

    public export(object:any) {
        let result:any = {};
        let schema = this.view.getModelFields();
        for(let field in schema) {
            if(schema[field]['type'] == 'many2one') {
                if(typeof object[field] == 'object') {
                    result[field] = object[field].id;
                }
                else {
                    result[field] = object[field];
                }                
            }
            else if(['one2many', 'many2many'].indexOf(schema[field]['type']) > -1) {
// #todo
                result[field] = object[field];
            }
            else {
                result[field] = object[field];
            }
        }
        return result;
    }

    /** 
     * Update model by requesting data from server using parent View parameters
    */
    public async refresh() {
        console.log('Model::refresh');

        // fetch fields that are present in the parent View 
        let view_fields: any[] = <[]>Object.keys(this.view.getViewFields());
        let schema = this.view.getModelFields();

        let fields = [];
        
        for(let i in view_fields) {
            
            let field = view_fields[i];
            if(!schema.hasOwnProperty(field)) {
                console.log('unknown field', field);
                continue;
            }
            // append `name` subfield for relational fields, using the dot notation
            if( 'many2one' == schema[field]['type'] ) {
                fields.push(field + '.name');
            }
            // we do not load relational fields resulting in potentially long lists (those are handled by the Widgets)
            else if(['one2many', 'many2many'].indexOf(schema[field]['type']) > -1) {
                delete fields[i];
            }
            else {
                fields.push(field);
            }
        }

        try {
// #todo - allow to fetch objects from an arbitrary controller (when filtering with domain is not enough)
// default controller is core_model_collect
            let response = await ApiService.collect(this.view.getEntity(), this.view.getDomain(), fields, this.view.getOrder(), this.view.getSort(), this.view.getStart(), this.view.getLimit(), this.view.getModelLang());

            this.objects = response;
            this.loaded_promise.resolve();
            this.total = ApiService.getLastCount();

        }
        catch(response) {
            console.log('Unable to fetch Collection from server', response);
            this.objects = [];
            this.loaded_promise.resolve();
            this.total = 0;
        }        
        // trigger model change handler in the parent View (in order to update the layout)
        await this.view.onchangeModel();        
    }
    
    /**
     * React to external request of Model change (one ore more objects in the collection have been updated through the Layout).
     * Changes are made on a field basis.
     * 
     */
    public change(ids: Array<any>, values: any) {
        console.log('Model::change', ids, values);
        let schema = this.view.getModelFields();
        for (let index in this.objects) {
            let object = this.objects[index];
            for (let id of ids) {
                if(object.hasOwnProperty('id') && object.id == id) {
                    for (let field in values) {
                        if(schema.hasOwnProperty(field)) {
                            if(!this.has_changed.hasOwnProperty(id)) {
                                this.has_changed[id] = [];
                            }
                            // update field
                            this.objects[index][field] = values[field];
                            // mark field as changed
                            this.has_changed[id].push(field);
                        }
                    }    
                }
            }
        }
    }

    /**
     * Handler for resetting change status and modified field of a given object, when an update occured and was accepted by server.
     * 
     * @param id 
     * @param values 
     */
    public reset(id: number, values: any) {
        console.log('Model::reset', values);
        for (let index in this.objects) {
            let object = this.objects[index];
            if(object.hasOwnProperty('id') && object.id == id) {
                this.has_changed[id] = [];
                for(let field in values) {
                    object[field] = values[field];
                }                
            }
        }
    }
    
    public ids() {
        if(this.objects.length == 0) {
            return [];
        }
        return this.objects.map( (object:any) => object.id );
    }

    /**
     * Return the Collection.
     * The result set can be limited to a subset of specific objects by specifying an array of ids.
     * 
     * @param ids array list of objects identifiers that must be returned
     */
    public get(ids:any[] = []) {
        console.log('Model::get', this.objects, this.has_changed);
        let promise = $.Deferred();
        this.loaded_promise.
        then( () => {
            if(ids.length) {
                // create a custom collection by filtering objects on their ids
                promise.resolve( this.objects.filter( (object:any) => ids.indexOf(+object['id']) > -1 ) );                
            }
            else {
                // return the full collection
                promise.resolve(this.objects);
            }            
        })
        .catch( () => promise.resolve({}) );

        return promise;
    }

    /**
     * Manually assign a list of objects from the current set (identified by their ids) to a given value (object).
     * 
     * @param ids 
     * @param object 
     */
    public async set(ids:number[] = [], object: any) {
        for(let id of ids) {
            let index = this.objects.findIndex( (o:any) => o.id == id );
            this.objects[index] = this.deepCopy(object);
        }
        await this.view.onchangeModel();
    }

    /**
     * Returns a collection holding only modified objects with their modified fields (not original objects).
     * The collection will be empty if no changes occured.
     * 
     * @param ids array list of objects identifiers that must be returned (if changed)
     */
    public getChanges(ids:any[] = []) {
        let collection = [];
        for(let id in this.has_changed) {
            if(ids.length && ids.indexOf(+id) < 0) continue;
            let fields = this.has_changed[id];
            let object = this.objects.find( (object:any) => object.id == id );
            if(object == undefined) continue;
            let result:any = {id: id};
            for(let field of fields) {
                result[field] = object[field];
            }
            // force appending `state`and `modified` fields (when present) for concurrency control
            if(object.hasOwnProperty('modified')) {
                result['modified'] = object.modified;
            }
            if(object.hasOwnProperty('state')) {
                result['state'] = object.state;
            }
            collection.push(result);
        }
        return collection;
    }

    public getTotal() {
        return this.total;
    }
}

export default Model;