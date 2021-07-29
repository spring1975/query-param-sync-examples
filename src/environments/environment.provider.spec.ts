import { environment } from './environment';
import { getEnv } from './environment.provider';

describe('Environment Provide', () => {
    it('should create get environment', () => {
        const env = environment;

        expect(getEnv()).toEqual(env);
    });
});
