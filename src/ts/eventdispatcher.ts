/*
 * Copyright (C) 2016, bitmovin GmbH, All Rights Reserved
 *
 * Authors: Mario Guggenberger <mario.guggenberger@bitmovin.com>
 *
 * This source code and its use and distribution, is subject to the terms
 * and conditions of the applicable license agreement.
 */

/**
 * Function interface for event listeners on the {@link EventDispatcher}.
 */
export interface EventListener<Sender, Args> {
    (sender: Sender, args: Args): void
}

/**
 * Empty type for creating {@link EventDispatcher event dispatchers} that do not carry any arguments.
 */
export interface NoArgs {
}

/**
 * Public interface that represents an event. Can be used to subscribe to and unsubscribe from events.
 */
export interface Event<Sender, Args> {
    /**
     * Subscribes an event listener to this event dispatcher.
     * @param listener the listener to add
     */
    subscribe(listener: EventListener<Sender, Args>): void;

    /**
     * Subscribes an event listener to this event dispatcher that will be called at a limited rate with a minimum
     * interval of the specified milliseconds.
     * @param listener the listener to add
     * @param rateMs the rate in milliseconds to which calling of the listeners should be limited
     */
    subscribeRateLimited(listener: EventListener<Sender, Args>, rateMs: number): void;

    /**
     * Unsubscribes a subscribed event listener from this dispatcher.
     * @param listener the listener to remove
     * @returns {boolean} true if the listener was successfully unsubscribed, false if it isn't subscribed on this dispatcher
     */
    unsubscribe(listener: EventListener<Sender, Args>): boolean;
}

/**
 * Event dispatcher to subscribe and trigger events. Each event should have its own dispatcher.
 */
export class EventDispatcher<Sender, Args> implements Event<Sender, Args> {

    private listeners: EventListenerWrapper<Sender, Args>[] = [];

    constructor() {
    }

    /**
     * {@inheritDoc}
     */
    subscribe(listener: EventListener<Sender, Args>) {
        this.listeners.push(new EventListenerWrapper(listener));
    }

    /**
     * {@inheritDoc}
     */
    subscribeRateLimited(listener: EventListener<Sender, Args>, rateMs: number) {
        this.listeners.push(new RateLimitedEventListenerWrapper(listener, rateMs));
    }

    /**
     * {@inheritDoc}
     */
    unsubscribe(listener: EventListener<Sender, Args>): boolean {
        // Iterate through listeners, compare with parameter, and remove if found
        for (let i = 0; i < this.listeners.length; i++) {
            let subscribedListener = this.listeners[i];
            if (subscribedListener.listener == listener) {
                this.listeners.splice(i, 1);
                return true;
            }
        }

        return false;
    }

    /**
     * Dispatches an event to all subscribed listeners.
     * @param sender the source of the event
     * @param args the arguments for the event
     */
    dispatch(sender: Sender, args: Args = null) {
        // Call every listener
        for (let listener of this.listeners) {
            listener.fire(sender, args);
        }
    }
}

/**
 * A basic event listener wrapper to manage listeners within the {@link EventDispatcher}. This is a "private" class
 * for internal dispatcher use and it is therefore not exported.
 */
class EventListenerWrapper<Sender, Args> {

    private eventListener: EventListener<Sender, Args>;

    constructor(listener: EventListener<Sender, Args>) {
        this.eventListener = listener;
    }

    /**
     * Returns the wrapped event listener.
     * @returns {EventListener<Sender, Args>}
     */
    get listener(): EventListener<Sender, Args> {
        return this.eventListener;
    }

    /**
     * Fires the wrapped event listener with the given arguments.
     * @param sender
     * @param args
     */
    fire(sender: Sender, args: Args) {
        this.eventListener(sender, args);
    }
}

/**
 * Extends the basic {@link EventListenerWrapper} with rate-limiting functionality.
 */
class RateLimitedEventListenerWrapper<Sender, Args> extends EventListenerWrapper<Sender, Args> {

    private rateMs: number;
    private rateLimitingEventListener: EventListener<Sender, Args>;

    private lastFireTime: number;

    constructor(listener: EventListener<Sender, Args>, rateMs: number) {
        super(listener); // sets the event listener sink

        this.rateMs = rateMs;
        this.lastFireTime = 0;

        // Wrap the event listener with an event listener that does the rate-limiting
        this.rateLimitingEventListener = function (sender: Sender, args: Args) {
            if (Date.now() - this.lastFireTime > this.rateMs) {
                // Only if enough time since the previous call has passed, call the
                // actual event listener and record the current time
                this.fireSuper(sender, args);
                this.lastFireTime = Date.now();
            }
        };
    }

    private fireSuper(sender: Sender, args: Args) {
        // Fire the actual external event listener
        super.fire(sender, args);
    }

    fire(sender: Sender, args: Args) {
        // Fire the internal rate-limiting listener instead of the external event listener
        this.rateLimitingEventListener(sender, args);
    }
}