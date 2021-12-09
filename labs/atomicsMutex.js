'use strict';

const threads = require('worker_threads');
const { ThreadStateError } = require('./exceptions');

const LOCKED = 0;
const UNLOCKED = 1;
const INDEX_OF_LOCKED = 0;
const INDEX_OF_LOCKED_THREAD = 1;
const INDEX_OF_NOTIFIED = 2;
const INDEX_OF_NOTIFIED_ALL = 3;
const INDEX_OF_THREADS = 4;

class AtomicsMutex {
    constructor(shared) {
        this.shared = new Int32Array(shared, 0, 5);
        Atomics.store(this.shared, INDEX_OF_LOCKED, UNLOCKED);
    }

    lock() {
        let prev = Atomics.exchange(this.shared, INDEX_OF_LOCKED, LOCKED);
        while (prev !== UNLOCKED) {
            prev = Atomics.exchange(this.shared, INDEX_OF_LOCKED, LOCKED);
        }
        Atomics.store(this.shared, INDEX_OF_LOCKED_THREAD, threads.threadId);
    }

    unlock() {
        Atomics.store(this.shared, INDEX_OF_LOCKED_THREAD, null);
        Atomics.store(this.shared, INDEX_OF_LOCKED, UNLOCKED);
    }

    wait() {
        if (Atomics.load(this.shared, INDEX_OF_LOCKED_THREAD) !== threads.threadId) {
            throw new ThreadStateError('ThreadStateError');
        }
        this.unlock();
        Atomics.store(this.shared, INDEX_OF_THREADS, Atomics.load(this.shared, INDEX_OF_THREADS) + 1);
        while (!Atomics.load(this.shared, INDEX_OF_NOTIFIED) && !Atomics.load(this.shared, INDEX_OF_NOTIFIED_ALL)) {}
        Atomics.store(this.shared, INDEX_OF_THREADS, Atomics.load(this.shared, INDEX_OF_THREADS) - 1);
        this.lock()
        Atomics.store(this.shared, INDEX_OF_NOTIFIED, 0);
    }

    notify() {
        if (Atomics.load(this.shared, INDEX_OF_LOCKED_THREAD) !== threads.threadId) {
            throw new ThreadStateError('ThreadStateError');
        }

        Atomics.store(this.shared, INDEX_OF_NOTIFIED, 1);
    }

    notifyAll() {
        if (Atomics.load(this.shared, INDEX_OF_LOCKED_THREAD) !== threads.threadId) {
            throw new ThreadStateError('ThreadStateError');
        }

        Atomics.store(this.shared, INDEX_OF_NOTIFIED_ALL, 1);

        while (Atomics.load(this.shared, INDEX_OF_THREADS)) {}

        Atomics.store(this.shared, INDEX_OF_NOTIFIED_ALL, 0);

    }
}

module.exports = AtomicsMutex;