import { InjectionToken } from '@angular/core';
import { environment } from './environment';

export interface Environment {
    production: boolean;
}

export const ENV = new InjectionToken<Environment>('env');

export const getEnv = (): Environment => environment;
