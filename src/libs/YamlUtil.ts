import yaml from 'js-yaml';
import fs from 'fs';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mergejson = require('mergejson');

export const loadConfig = (name: string): any => {
    const environment = process.env.NODE_ENV;
    const envConfigFile = `./cfg/${name}.${environment}.yml`;
    const configFile = `./cfg/${name}.yml`;
    let cfg = {};

    if (fs.existsSync(envConfigFile)) {
        const envConfig = yaml.load(fs.readFileSync(envConfigFile, 'utf8'));
        Object.assign(cfg, envConfig);
    }
    if (fs.existsSync(configFile)) {
        const config = yaml.load(fs.readFileSync(configFile, 'utf8'));
        cfg = mergejson(cfg, config);
    }

    return cfg;
};
