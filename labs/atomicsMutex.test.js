'use strict';

const threads = require('worker_threads');
const AtomicsMutex = require('./atomicsMutex');
const Exceptions = require('./exceptions');

const mocks = new Map();

function mockProperty(object, property, value) {
    const descriptor = Object.getOwnPropertyDescriptor(object, property);
    const mocksForThisObject = mocks.get(object) || {};
    mocksForThisObject[property] = descriptor;
    mocks.set(object, mocksForThisObject);
    Object.defineProperty(object, property, { get: () => value });
}

function undoMockProperty(object, property) {
    Object.defineProperty(object, property, mocks.get(object)[property]);
}



const LOCKED = 0;
const UNLOCKED = 1;
const INDEX_OF_LOCKED = 0;
const INDEX_OF_LOCKED_THREAD = 1;
const INDEX_OF_NOTIFIED = 2;
const INDEX_OF_NOTIFIED_ALL = 3;
const INDEX_OF_THREADS = 4;

let mutex;
let lock;
let unlock;
let wait;
let notify;
let notifyAll;
let buffer;
describe('AtomicsMutex', () => {
    beforeEach(() => {
        buffer = new SharedArrayBuffer(1024);
        mutex = new AtomicsMutex(buffer);
        lock = jest.spyOn(mutex, 'lock');
        unlock = jest.spyOn(mutex, 'unlock');
        wait = jest.spyOn(mutex, 'wait');
        notify = jest.spyOn(mutex, 'notify');
        notifyAll = jest.spyOn(mutex, 'notifyAll');
    })
    afterEach(() => {
        jest.clearAllMocks();
        jest.restoreAllMocks();
    })
    describe('lock', () => {
        it('should change status in shared array', () => {
            expect(mutex.shared[INDEX_OF_LOCKED]).toEqual(UNLOCKED);
            mutex.lock();
            expect(mutex.shared[INDEX_OF_LOCKED]).toEqual(LOCKED);
            expect(mutex.shared[INDEX_OF_LOCKED_THREAD]).toEqual(0);
            expect(lock).toHaveBeenCalledTimes(1);
        })
    })
    describe('unlock', () => {
        it('should change status in shared array', () => {
            expect(mutex.shared[INDEX_OF_LOCKED]).toEqual(UNLOCKED);
            mutex.lock();
            expect(mutex.shared[INDEX_OF_LOCKED]).toEqual(LOCKED);
            expect(mutex.shared[INDEX_OF_LOCKED_THREAD]).toEqual(0);
            mutex.unlock();
            expect(mutex.shared[INDEX_OF_LOCKED]).toEqual(UNLOCKED);

            expect(lock).toHaveBeenCalledTimes(1);
            expect(unlock).toHaveBeenCalledTimes(1);
        })
    })
    describe('wait', () => {
        it('should throw error', () => {
            mockProperty(threads, 'threadId', 1);
            try{
                mutex.wait();
            } catch (e) {
                expect(e).toBeInstanceOf(Exceptions.ThreadStateError)
            }
            undoMockProperty(threads, 'threadId');
        })
        it('should work as expected', () => {
            mutex.notify()
            mutex.wait();
            expect(lock).toHaveBeenCalledTimes(1);
            expect(unlock).toHaveBeenCalledTimes(1);
        })
    })
    describe('notify', () => {
        it('should throw error', () => {
            mockProperty(threads, 'threadId', 1);
            try{
                mutex.notify();
            } catch (e) {
                expect(e).toBeInstanceOf(Exceptions.ThreadStateError)
            }
            undoMockProperty(threads, 'threadId');
        })
        it('should work as expected', () => {
            mutex.notify()
            expect(mutex.shared[INDEX_OF_NOTIFIED]).toEqual(1);
        })
    })
    describe('notifyAll', () => {
        it('should throw error', () => {
            mockProperty(threads, 'threadId', 1);
            try{
                mutex.notifyAll();
            } catch (e) {
                expect(e).toBeInstanceOf(Exceptions.ThreadStateError)
            }
            undoMockProperty(threads, 'threadId');
        })
        it('should work as expected with .wait', () => {
            new threads.Worker(`${__dirname}/utilForTests/callNotifyAll.js`, { workerData: buffer })
            mutex.wait()
            expect(mutex.shared[INDEX_OF_NOTIFIED_ALL]).toEqual(0);
        })
        it('should work as expected', () => {
            mutex.notifyAll();
            expect(mutex.shared[INDEX_OF_NOTIFIED_ALL]).toEqual(0);
        })
    })
})