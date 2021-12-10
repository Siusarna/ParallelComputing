'use strict';
const threads = require('worker_threads');
const fs = require('fs');
const AtomicsMutex = require('../atomicsMutex');

const { workerData } = threads;
const mutex = new AtomicsMutex(workerData);
fs.writeFileSync('bla.txt', 'AAAAAAAAAAAAAAAAAAAA')
setTimeout(() => {
    fs.writeFileSync('bla1.txt', 'BBBBBBBBBBBBBBBBBBBBBBBB')
    mutex.lock()
    mutex.notify()
    mutex.unlock()
}, 3000)

