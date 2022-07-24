declare const GLOBAL_VAR_SERVICE_NAME: string;
declare const GLOBAL_VAR_NODE_ENV: 'dev' | 'uat' | 'prod';

declare namespace NodeJS {
  export interface ProcessEnv {}
}
