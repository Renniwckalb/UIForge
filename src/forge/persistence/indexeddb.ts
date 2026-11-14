import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ComponentDoc } from "../model/types";
import { summarize, type ComponentRepository, type ComponentSummary } from "./repository";

interface ForgeDB extends DBSchema {
  components: { key: string; value: ComponentDoc };
}

let dbPromise: Promise<IDBPDatabase<ForgeDB>> | null = null;
function db() {
  dbPromise ??= openDB<ForgeDB>("ui-forge", 1, {
    upgrade(d) {
      d.createObjectStore("components", { keyPath: "id" });
    },
  });
  return dbPromise;
}

export class IndexedDbRepository implements ComponentRepository {
  async list(): Promise<ComponentSummary[]> {
    const all = await (await db()).getAll("components");
    return all.map(summarize).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async get(id: string) {
    return (await (await db()).get("components", id)) ?? null;
  }
  async save(doc: ComponentDoc) {
    await (await db()).put("components", doc);
  }
  async remove(id: string) {
    await (await db()).delete("components", id);
  }
}

let repo: ComponentRepository | null = null;
export function getRepository(): ComponentRepository {
  repo ??= new IndexedDbRepository();
  return repo;
}
