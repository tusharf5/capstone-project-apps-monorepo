declare const GLOBAL_VAR_SERVICE_NAME: string;
declare const GLOBAL_VAR_NODE_ENV: 'qa' | 'uat' | 'dev' | 'prod';
declare const GLOBAL_VAR_REGION: string;

declare namespace NodeJS {
  export interface ProcessEnv {
    ACCOUNT_ID: string;
    STAGE: string;
    REGION: string;
  }
}
