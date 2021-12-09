'use strict';

class ThreadStateError extends Error {
    constructor(msg) {
        super(msg);
    }
}

module.exports = {
    ThreadStateError
}