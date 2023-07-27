export function resDecorator(res) {
    res.status = function(code) {
        this.statusCode = code;
        return this;
    }

    res.json = function(data) {
        if(!this.headersSent) {
            this.setHeader('Content-Type', 'application/json');
        }

        this.end(JSON.stringify(data));
    }
}