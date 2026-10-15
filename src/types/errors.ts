export type ImprintErrorCode =
    | 'environment'            // not running in a browser
    | 'component_timeout'      // a component did not finish in `timeout` ms
    | 'component_error'        // a component threw / rejected / returned non-JSON data
    | 'component_unsupported'  // the browser does not offer the API (component returned null)

export interface ImprintError {
    code: ImprintErrorCode;
    message: string;
    component?: string;
}

export type ImprintExceptionCode = 'invalid_options' | 'invalid_component';