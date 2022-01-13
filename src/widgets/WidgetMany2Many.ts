import Widget from "./Widget";
import { Layout, Domain } from "../equal-lib";
import { UIHelper } from '../material-lib';

import View from "../View";
import { ApiService, TranslationService } from "../equal-services";

export default class WidgetMany2Many extends Widget {

    protected rel_type: string;

    constructor(layout:Layout, label: string, value: any, config: any) {
        super(layout, 'many2many', label, value, config);
        this.rel_type = 'many2many';
    }

    public render():JQuery {
        console.log('WidgetMany2Many::render', this);

        this.$elem = $('<div />');

        // make sure view is not instanciated during 'layout' phase (while config is still incomplete)
        if(this.config.hasOwnProperty('ready') && this.config.ready) {

            let view_config = {
                ...this.config,
                ...{
                    show_actions: true,
                    // update the actions of the "current selection" button
                    selection_actions: [
                        {
                            title: 'SB_ACTIONS_BUTTON_REMOVE',
                            icon:  'delete',
                            handler: (selection:any) => {
                                for(let id of selection) {
                                    let index = this.value.indexOf(id);
                                    if( index == -1 ) {
                                        if( this.value.indexOf(-id) == -1 ) {
                                            this.value.push(-id);
                                        }
                                    }
                                    else {
                                        this.value[index] = -this.value[index];
                                    }
                                }
                                this.$elem.trigger('_updatedWidget');
                            }
                        }
                    ]
                }
            };

            let view = new View(this.getLayout().getView().getContext(), this.config.entity, this.config.view_type, this.config.view_name, this.config.domain, this.mode, 'widget', this.config.lang, view_config);

            view.isReady().then( () => {
                let $container = view.getContainer();


                if(this.mode == 'edit') {

                    let $actions_set = $container.find('.sb-view-header-list-actions-set');

                    if(this.rel_type == 'many2many') {
                        $actions_set
                        .append(
                            UIHelper.createButton('action-edit', TranslationService.instant('SB_ACTIONS_BUTTON_ADD'), 'raised')
                            .on('click', async () => {
                                let purpose = (this.rel_type == 'many2many')?'add':'select';

                                // request a new Context for selecting an existing object to add to current selection
                                this.getLayout().openContext({
                                    entity: this.config.entity,
                                    type: 'list',
                                    name: 'default',
                                    domain: [],
                                    mode: 'view',
                                    purpose: purpose,
                                    callback: (data:any) => {
                                        if(data && data.selection) {
                                            // add ids that are not yet in the Object value
                                            for(let id of data.selection) {
                                                let index = this.value.indexOf(id);
                                                if( index == -1) {
                                                    this.value.push(id);
                                                }
                                            }
                                            this.$elem.trigger('_updatedWidget');
                                        }
                                    }
                                });
                            })
                        );
                    }


                    // generate domain for object creation
                    let domain = new Domain(this.config.domain);
                    domain.merge(new Domain([this.config.foreign_field, '=', this.config.object_id]));

                    $actions_set
                    .append(
                        UIHelper.createButton('action-create', TranslationService.instant('SB_ACTIONS_BUTTON_CREATE'), 'raised')
                        .on('click', async () => {
                            // request a new Context for selecting an existing object to add to current selection
                            this.getLayout().openContext({
                                entity: this.config.entity,
                                type: 'form',
                                name: 'default',
                                domain: domain.toArray(),
                                mode: 'edit',
                                purpose: 'create',
                                callback: (data:any) => {
                                    if(data && data.selection) {
                                        if(data.selection.length) {
                                            for(let id of data.selection) {
                                                this.value.push(id);
                                            }
                                            this.$elem.trigger('_updatedWidget');
                                        }
                                    }
                                }
                            });
                        })
                    );

                }

                // inject View in parent Context object
                this.$elem.append($container);
            });

        }

        this.$elem.addClass('sb-widget').attr('id', this.getId());

        return this.$elem;
    }

}