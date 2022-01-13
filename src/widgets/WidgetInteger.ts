import WidgetString from "./WidgetString";
import Layout from "../Layout";

import { UIHelper } from '../material-lib';

export default class WidgetInteger extends WidgetString {
    

    constructor(layout: Layout, label: string, value: any, config: any) {
        super(layout, label, value, config);
    }
    
    public render():JQuery {
        this.$elem = super.render();
        let $input = this.$elem.find('input');
        $input.attr( "type", "number" );
        if(this.config.hasOwnProperty('min')) {
            $input.attr( "min", this.config.min );
        }
        if(this.config.hasOwnProperty('max')) {
            $input.attr( "max", this.config.max );
        }
        return this.$elem;
    }
}