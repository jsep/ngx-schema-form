import {
  Directive,
  ContentChildren,
  QueryList,
  AfterContentInit,
  HostBinding,
  SimpleChange,
  SimpleChanges,
  Input
} from '@angular/core';
import { merge } from 'rxjs';
import { filter, debounceTime } from 'rxjs/operators';

import { FormComponent } from '../form/form.component';
import { ActionRegistry } from '../model/actionregistry';
import { ValidatorRegistry } from '../model/validatorregistry';
import { SchemaPropertyType } from '../schema';

import { TemplateSchemaService } from './template-schema.service';
import { FieldComponent } from './field/field.component';
import { Field } from './field/field';
import { ButtonComponent } from './button/button.component';
import { FieldParent } from './field/field-parent';
import { FieldRegistry } from './field/field-registry';


@Directive({
  selector: 'sf-form[templateSchema]',
  providers: [
    TemplateSchemaService
  ]
})
export class TemplateSchemaDirective extends FieldParent implements AfterContentInit {

  @ContentChildren(FieldComponent)
  childFields: QueryList<FieldComponent>;

  @ContentChildren(ButtonComponent)
  childButtons: QueryList<ButtonComponent>;

  @Input()
  fieldsets: { [key: string]: any }[];

  constructor(
    protected actionRegistry: ActionRegistry,
    protected validatorRegistry: ValidatorRegistry,
    private formComponent: FormComponent,
    private templateSchemaService: TemplateSchemaService,
    private fieldRegistry: FieldRegistry,
  ) {
    super();
  }

  setFormDocumentSchema(fields: FieldComponent[]) {
    this.actionRegistry.clear();
    this.validatorRegistry.clear();

    const schema = this.getFieldsSchema(fields);
    this.fieldRegistry.clear();
    fields.forEach((field) => {
      field.register();
    });

    const _validators = this.getFieldsValidators(fields);
    _validators.forEach(({ path, validators }) => {
      this.validatorRegistry.register(path, validators);
    });

    const previousSchema = this.formComponent.schema;
    this.formComponent.schema = {
      type: SchemaPropertyType.Object,
      properties: schema.properties
    };

    if (this.fieldsets) {
      this.formComponent.schema.fieldsets = this.fieldsets;
    }

    if (schema.required && schema.required.length > 0) {
      this.formComponent.schema.required = schema.required;
    }

    const buttons = this.getButtons();
    if (buttons.length > 0) {
      this.formComponent.schema.buttons = buttons;
    }

    this.formComponent.ngOnChanges({
      schema: new SimpleChange(
        previousSchema,
        this.formComponent.schema,
        Boolean(previousSchema)
      )
    });

  }


  ngAfterContentInit() {

    if (this.childFields.length > 0) {
      this.setFormDocumentSchema(this.childFields.toArray());
    }

    merge(
      this.childFields.changes,
      this.childButtons.changes,
      this.templateSchemaService.changes
    )
    .pipe(
      filter((value) => Boolean(value)),
      debounceTime(50)
    )
    .subscribe(() => {
      this.setFormDocumentSchema(this.childFields.toArray());
    });

  }

}
