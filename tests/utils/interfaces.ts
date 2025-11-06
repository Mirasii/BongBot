export interface ExpectedResult {
    hasEmbeds?: boolean, 
    hasFiles?: boolean, 
    isString?: boolean, 
    properties?: { 
        key: string, 
        value: any 
    }[]
}

export interface Command {
    data: {
        name: string,
        description: string
    },
    execute: Function
}