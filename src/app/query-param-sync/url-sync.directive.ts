import {
  Directive,
  HostListener,
  Input,
  OnInit,
  ElementRef,
  Inject,
  Optional,
  Renderer2,
  SimpleChange,
  OnDestroy
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { map, distinctUntilKeyChanged } from 'rxjs/operators';
import {
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
  NgControl,
  FormControl,
  AbstractControlDirective,
  DefaultValueAccessor,
  FormControlDirective,
  CheckboxControlValueAccessor,
  RangeValueAccessor,
  NumberValueAccessor,
  SelectControlValueAccessor,
  SelectMultipleControlValueAccessor,
  RadioControlValueAccessor
} from '@angular/forms';

interface Serialization {
  serialize: (val: any) => any;
  deserialize: (val: any) => any;
}

const serializers: { [K: string]: Serialization } = {
  dates: {
    serialize: (val: any) => val,
    deserialize: (val: any) => ({ start: val.start, end: val.end })
  },
  toggle: {
    serialize: (val: any) => ({ check: val }),
    deserialize: (val: any) => ({ check: !!val })
  }
};

@Directive({
  selector: '[urlSync]'
})
export class UrlSyncDirective extends FormControlDirective implements OnInit, OnDestroy {

  @Input('urlSync')
  get paramName() {
    throw new Error('Attribute "paramName" is required');
  }
  set paramName(value: string) {
    Object.defineProperty(this, 'paramName', {
      value,
      writable: true,
      configurable: true,
    });
  }

  form = new FormControl('');

  private readonly _subscription: Subscription = new Subscription();

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly el: ElementRef,
    private readonly renderer: Renderer2,
    @Optional()
    @Inject(NG_VALUE_ACCESSOR)
    private readonly controls: ControlValueAccessor[]
  ) {
    super([], [], controls, '');
    if (controls) {
      this.valueAccessor = selectValueAccessor(this, this.controls);
      if (this.valueAccessor) {
        const changeFn = this.valueAccessor.registerOnChange.bind(this.valueAccessor);
        this.valueAccessor.registerOnChange = (fn: any) => {
          const f = (val: any) => {
            const value = serializers[this.paramName].serialize(val);
            this.router.navigate([], {
              queryParams: { ...value },
              queryParamsHandling: 'merge'
            });
            fn(val);
          };
          changeFn(f);
        };
      }
      // eslint-disable-next-line @angular-eslint/no-lifecycle-call
      this.ngOnChanges({ form: new SimpleChange('', this.form, false) });
    }
  }

  @HostListener('input', ['$event.target.value']) keyup(value: any) {
    if (!this.controls) {
      this.router.navigate([], {
        queryParams: { [this.paramName]: value || null },
        queryParamsHandling: 'merge'
      });
    }
  }

  ngOnInit() {
    let sub: Subscription;
    if (serializers[this.paramName]) {
      sub = this.route.queryParams
        .pipe(map(params => serializers[this.paramName].deserialize(params)))
        .subscribe(paramValue => {
          if (this.controls) {
            this.valueAccessor?.writeValue(paramValue);

          } else {
            this.renderer.setProperty(
              this.el.nativeElement,
              'value',
              paramValue
            );
          }
        });
    } else {
      sub = this.route.queryParams
        .pipe(
          distinctUntilKeyChanged(this.paramName),
          map(queryParams => queryParams[this.paramName] || '')
        )
        .subscribe(paramValue => {
          this.renderer.setProperty(this.el.nativeElement, 'value', paramValue);
        });
    }
    this._subscription.add(sub);
  }

  ngOnDestroy() {
    this._subscription.unsubscribe();
  }
}

export const selectValueAccessor = (
  dir: NgControl,
  valueAccessors: ControlValueAccessor[]
): ControlValueAccessor | null => {
  if (!valueAccessors) { return null; }

  if (!Array.isArray(valueAccessors)) {
    _throwError(
      dir,
      'Value accessor was not provided as an array for form control with'
    );
  }

  let defaultAccessor: ControlValueAccessor | undefined;
  let builtinAccessor: ControlValueAccessor | undefined;
  let customAccessor: ControlValueAccessor | undefined;

  valueAccessors.forEach((v: ControlValueAccessor) => {
    if (v.constructor === DefaultValueAccessor) {
      defaultAccessor = v;
    } else if (isBuiltInAccessor(v)) {
      if (builtinAccessor) {
        _throwError(
          dir,
          'More than one built-in value accessor matches form control with'
        );
      }
      builtinAccessor = v;
    } else {
      if (customAccessor) {
        _throwError(
          dir,
          'More than one custom value accessor matches form control with'
        );
      }
      customAccessor = v;
    }
  });

  if (customAccessor) { return customAccessor; }
  if (builtinAccessor) { return builtinAccessor; }
  if (defaultAccessor) { return defaultAccessor; }

  _throwError(dir, 'No valid value accessor for form control with');
  return null;
};

const _throwError = (dir: AbstractControlDirective, message: string): void => {
  let messageEnd = 'unspecified name attribute';
  if (dir.path) {
    if (dir.path?.length > 1) {
      messageEnd = `path: '${dir.path.join(' -> ')}'`;
    } else if (dir.path[0]) {
      messageEnd = `name: '${dir.path}'`;
    }
  }
  throw new Error(`${message} ${messageEnd}`);
};

const BUILTIN_ACCESSORS = [
  CheckboxControlValueAccessor,
  RangeValueAccessor,
  NumberValueAccessor,
  SelectControlValueAccessor,
  SelectMultipleControlValueAccessor,
  RadioControlValueAccessor
];

const isBuiltInAccessor = (valueAccessor: ControlValueAccessor): boolean =>
  BUILTIN_ACCESSORS.some(a => valueAccessor.constructor === a);
