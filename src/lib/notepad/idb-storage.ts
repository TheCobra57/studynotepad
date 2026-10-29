/**
 * IndexedDB-backed storage for the notepad store (via localforage).
 *
 * Replaces the old localStorage persistence — localStorage caps out at
 * ~5 MB, while IndexedDB comfortably holds hundreds of MB, which matters
 * once notes contain pasted images. localforage keeps the exact
 * getItem/setItem/removeItem shape zustand's persist middleware expects
 * and transparently falls back to localStorage only in the rare browsers
 * where IndexedDB is unavailable.
 *
 * The first read transparently migrates legacy data: if IndexedDB has
 * nothing under the key yet but old localStorage data exists, the value
 * is copied into IndexedDB and the legacy key is removed afterwards — so
 * existing users keep every note without doing anything.
 */
import localforage, { type LocalForage } from 'localforage'
import type { StateStorage } from 'zustand/middleware'
import { STORAGE_KEY } from './constants'

/** lazy so importing this module never touches IndexedDB during SSR */
let instance: LocalForage | null = null
function db(): LocalForage {
  if (!instance) {
    instance = localforage.createInstance({ name: 'studypad', storeName: 'kv' })
  }
  return instance
}

/**
 * Did the last persisted-state read find saved data (IndexedDB *or* the
 * legacy localStorage copy)? The welcome dialog uses this to tell
 * returning users apart from genuine first-time visitors — it must be
 * read only after the store has hydrated, when the answer is known.
 */
let lastReadHadData = false
export function hasStoredData(): boolean {
  return lastReadHadData
}

async function getItem(name: string): Promise<string | null> {
  // 1. the data already lives in IndexedDB
  const current = await db().getItem<string>(name)
  if (current != null) {
    lastReadHadData = true
    return current
  }
  // 2. one-time migration from the pre-IndexedDB localStorage era
  if (typeof window !== 'undefined') {
    const legacy = window.localStorage.getItem(name)
    if (legacy !== null) {
      await db().setItem(name, legacy) // copy into IndexedDB first…
      window.localStorage.removeItem(name) // …drop the legacy key only once that worked
      lastReadHadData = true
      return legacy
    }
  }
  lastReadHadData = false
  return null
}

/** zustand StateStorage — promise-based, which persist supports natively */
export const idbStorage: StateStorage = {
  getItem: (name) => getItem(name),
  setItem: async (name, value) => {
    await db().setItem(name, value)
  },
  removeItem: async (name) => {
    await db().removeItem(name)
  },
}

/** no-op storage used during SSR — reads find nothing, writes go nowhere, so
 *  the persist middleware hydrates instantly with the default state instead
 *  of erroring on an undefined storage. Methods are async on purpose: the
 *  rehydration callback then defers to a microtask, after the store has been
 *  fully initialized (a synchronous getItem would fire it mid-creation). */
const noopStorage: StateStorage = {
  getItem: async () => null,
  setItem: async () => {},
  removeItem: async () => {},
}

/** factory for createJSONStorage — the server gets the no-op variant, the
 *  browser gets IndexedDB */
export function browserStorage(): StateStorage {
  return typeof window === 'undefined' ? noopStorage : idbStorage
}

/** read the raw persisted value directly (used by tests/tooling) */
export async function readRawPersisted(): Promise<string | null> {
  return getItem(STORAGE_KEY)
}
