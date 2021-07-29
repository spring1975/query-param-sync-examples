import {
  Directive,
  HostListener,
  Input,
  OnInit,
  ElementRef,
  Inject,
  Optional,
  SkipSelf,
  Renderer2,
  SimpleChange
} from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { Subscription } from "rxjs";
import { map, filter, distinctUntilKeyChanged, tap } from "rxjs/operators";
import {
  NG_VALUE_ACCESSOR,
  ControlValueAccessor,
  ControlContainer,
  NgControl,
  FormControl,
  AbstractControlDirective,
  DefaultValueAccessor,
  FormControlDirective,
  NgModel,
  FormGroupDirective,
  FormControlName,
  FormGroup,
  CheckboxControlValueAccessor,
  RangeValueAccessor,
  NumberValueAccessor,
  SelectControlValueAccessor,
  SelectMultipleControlValueAccessor,
  RadioControlValueAccessor
} from "@angular/forms";

const serializers = {
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
  selector: "[urlSync]"
})
export class UrlSyncDirective extends FormControlDirective implements OnInit {
  private _subscription: Subscription;

  @Input("urlSync") paramName;

  @HostListener("input", ["$event.target.value"]) keyup(value: any) {
    if (!this.controls) {
      this.router.navigate([], {
        queryParams: { [this.paramName]: value || null },
        queryParamsHandling: "merge"
      });
    }
  }

  form = new FormControl('');

  constructor(
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly el: ElementRef,
    private readonly renderer: Renderer2,
    @Optional()
    @Inject(NG_VALUE_ACCESSOR)
    private readonly controls: ControlValueAccessor[]
  ) {
    super([], [], controls, "");
    if (controls) {
      this.valueAccessor = selectValueAccessor(this, this.controls);
        const changeFn = this.valueAccessor.registerOnChange.bind(this.valueAccessor);
        this.valueAccessor.registerOnChange = (fn: any) => {
          const f = (val: any) => {
            const value = serializers[this.paramName].serialize(val);
            this.router.navigate([], {
              queryParams: { ...value },
              queryParamsHandling: "merge"
            });
            fn(val);
          };
          changeFn(f);
        };
        this.ngOnChanges({ form: new SimpleChange("", this.form, false) });
    }
  }

  ngOnInit() {
    if (serializers[this.paramName]) {
      this._subscription = this.route.queryParams
        .pipe(map(params => serializers[this.paramName].deserialize(params)))
        .subscribe(paramValue => {
          if (this.controls) {
            this.valueAccessor.writeValue(paramValue);
           
          } else {
            this.renderer.setProperty(
              this.el.nativeElement,
              "value",
              paramValue
            );
          }
        });
    } else {
      this._subscription = this.route.queryParams
        .pipe(
          distinctUntilKeyChanged(this.paramName),
          map(queryParams => queryParams[this.paramName] || "")
        )
        .subscribe(paramValue => {
          this.renderer.setProperty(this.el.nativeElement, "value", paramValue);
        });
    }
  }
}

export function selectValueAccessor(
  dir: NgControl,
  valueAccessors: ControlValueAccessor[]
): ControlValueAccessor | null {
  if (!valueAccessors) return null;

  if (!Array.isArray(valueAccessors))
    _throwError(
      dir,
      "Value accessor was not provided as an array for form control with"
    );

  let defaultAccessor: ControlValueAccessor | undefined = undefined;
  let builtinAccessor: ControlValueAccessor | undefined = undefined;
  let customAccessor: ControlValueAccessor | undefined = undefined;

  valueAccessors.forEach((v: ControlValueAccessor) => {
    if (v.constructor === DefaultValueAccessor) {
      defaultAccessor = v;
    } else if (isBuiltInAccessor(v)) {
      if (builtinAccessor)
        _throwError(
          dir,
          "More than one built-in value accessor matches form control with"
        );
      builtinAccessor = v;
    } else {
      if (customAccessor)
        _throwError(
          dir,
          "More than one custom value accessor matches form control with"
        );
      customAccessor = v;
    }
  });

  if (customAccessor) return customAccessor;
  if (builtinAccessor) return builtinAccessor;
  if (defaultAccessor) return defaultAccessor;

  _throwError(dir, "No valid value accessor for form control with");
  return null;
}

function _throwError(dir: AbstractControlDirective, message: string): void {
  let messageEnd: string;
  if (dir.path!.length > 1) {
    messageEnd = `path: '${dir.path!.join(" -> ")}'`;
  } else if (dir.path![0]) {
    messageEnd = `name: '${dir.path}'`;
  } else {
    messageEnd = "unspecified name attribute";
  }
  throw new Error(`${message} ${messageEnd}`);
}

const BUILTIN_ACCESSORS = [
  CheckboxControlValueAccessor,
  RangeValueAccessor,
  NumberValueAccessor,
  SelectControlValueAccessor,
  SelectMultipleControlValueAccessor,
  RadioControlValueAccessor
];

function isBuiltInAccessor(valueAccessor: ControlValueAccessor): boolean {
  return BUILTIN_ACCESSORS.some(a => valueAccessor.constructor === a);
}
