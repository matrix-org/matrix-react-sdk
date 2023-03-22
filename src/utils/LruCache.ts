/*
Copyright 2023 The Matrix.org Foundation C.I.C.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

interface CacheItem<K, V> {
    key: K;
    value: V;
    /** Next item in the list */
    next: CacheItem<K, V> | null;
    /** Previous item in the list */
    prev: CacheItem<K, V> | null;
}

/**
 * Least Recently Used cache.
 * Can be initialised with a capacity and drops the least recently used items.
 *
 * Implemented via a key lookup map and a double linked list:
 *             head              tail
 *              a next → b next → c → next null
 *  null ← prev a ← prev b ← prev c
 *
 * @template K - Type of the key used to look up the values inside the cache
 * @template V - Type of the values inside the cache
 */
export class LruCache<K, V> {
    /** Head of the list. */
    private head: CacheItem<K, V> | null = null;
    /** Tail of the list */
    private tail: CacheItem<K, V> | null = null;
    /** Key lookup map */
    private map: Map<K, CacheItem<K, V>>;

    /**
     * @param capacity - Cache capcity.
     * @throws {Error} - Raises an error if the cache capacity is less than 1.
     */
    public constructor(private capacity: number) {
        if (this.capacity < 1) {
            throw new Error("Cache capacity must be at least 1");
        }

        this.map = new Map();
    }

    /**
     * Whether the cache contains an item under this key.
     * Marks the item as most recently used.
     *
     * @param key - Key of the item
     * @returns true: item in cache, else false
     */
    public has(key: K): boolean {
        return this.getItem(key) !== undefined;
    }

    /**
     * Returns an item from the cache.
     * Marks the item as most recently used.
     *
     * @param key - Key of the item
     * @returns The value if found, else undefined
     */
    public get(key: K): V | undefined {
        return this.getItem(key)?.value;
    }

    /**
     * Adds an item to the cache.
     * A newly added item will be the set as the most recently used.
     *
     * @param key - Key of the item
     * @param value - Item value
     */
    public set(key: K, value: V): void {
        const item = this.getItem(key);

        if (item) {
            // The item is already stored under this key. Update the value.
            item.value = value;
            return;
        }

        const newItem = {
            key,
            value,
            next: null,
            prev: null,
        };

        if (this.head) {
            // Put item in front of the list.
            this.head.prev = newItem;
            newItem.next = this.head;
        }

        this.head = newItem;

        if (!this.tail) {
            // This is the first item added to the list. Also set it as tail.
            this.tail = newItem;
        }

        // Store item in lookup map.
        this.map.set(key, newItem);

        if (this.map.size > this.capacity) {
            // Map size exceeded cache capcity. Drop tail item.
            this.map.delete(this.tail.key);
            this.tail = this.tail.prev;
            this.tail.next = null;
        }
    }

    /**
     * Returns an iterator over the cached values.
     */
    public *values(): IterableIterator<V> {
        for (const item of this.map.values()) {
            yield item.value;
        }
    }

    private getItem(key: K): CacheItem<K, V> | undefined {
        const item = this.map.get(key);

        // Not in cache.
        if (!item) return undefined;

        // Item is already at the head of the list.
        // No update required.
        if (item === this.head) return item;

        // Remove item from the list…
        if (item === this.tail && item.prev) {
            this.tail = item.prev;
        }

        item.prev.next = item.next;

        if (item.next) {
            item.next.prev = item.prev;
        }

        // …and put it to the front.
        this.head.prev = item;
        item.prev = null;
        item.next = this.head;
        this.head = item;

        return item;
    }
}
