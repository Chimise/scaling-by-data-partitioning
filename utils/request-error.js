class RequestError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }

    toJSON() {
        const properties = Object.getOwnPropertyNames(this);
        let obj = {};
        for (const property in properties) {
            obj[property] = this[property];
        }

        return obj;
    }
}

export default RequestError;