import Widget from "./Widget";
import Layout from "../Layout";

import { UIHelper } from '../material-lib';

import moment from 'moment/moment.js';
import { $, jqlocale } from "../jquery-lib";
import { environment } from "../environment";

export default class WidgetDate extends Widget {
    
    
    constructor(layout: Layout, label: string, value: any, config: {}) {
        super(layout, 'date', label, value, config);
    }

    public change(value: any) {
        this.$elem.find('input').datepicker('setDate', value).trigger('change');
    }

    public render(): JQuery {
        let date = new Date(this.value);
        let value:any;

        switch(this.mode) {
            case 'edit':
                value = moment(date).format('L');
                this.$elem = UIHelper.createInput('', this.label, value, this.config.description, 'calendar_today');
                if(this.config.layout == 'list') {
                    this.$elem.css({"width": "calc(100% - 10px)"});
                }
                // setup handler for relaying value update to parent layout
                this.$elem.find('input')
                .datepicker( {
                    showOn: "button", 
                    ...jqlocale[environment.locale], 
                    onClose: () => {
                        // give the focus back once the widget will have been refreshed
                        setTimeout( () => {
                            $('#'+this.getId()).find('input').first().trigger('focus');
                        }, 250);
                    }
                } )
                .on('change', (event:any) => {
                    // update widget value using jQuery `getDate`
                    let $this = $(event.currentTarget);
                    let date = $this.datepicker('getDate');
                    this.value = date.toISOString();
                    this.$elem.trigger('_updatedWidget');
                });
                break;
            case 'view':
            default:
                value = moment(date).format('LL');
                this.$elem = UIHelper.createInputView('', this.label, value);
                break;
        }
        this.$elem.addClass('sb-widget').addClass('sb-widget-mode-'+this.mode).attr('id', this.getId());

        return this.$elem;
    }
    
}