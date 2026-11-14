/**
 * Couche d'accès aux composants sauvegardés. Le studio ne dépend que de cette interface :
 * pour brancher une base de données, implémenter ComponentRepository (ex. via des routes API)
 * et l'exporter depuis getRepository().
 */
import type { ComponentDoc } from "../model/types";

export type ComponentSummary = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  nodeCount: number;
  template?: string;
};

export interface ComponentRepository {
  list(): Promise<ComponentSummary[]>;
  get(id: string): Promise<ComponentDoc | null>;
  save(doc: ComponentDoc): Promise<void>;
  remove(id: string): Promise<void>;
}

export function summarize(doc: ComponentDoc): ComponentSummary {
  return {
    id: doc.id,
    name: doc.name,
    updatedAt: doc.meta.updatedAt,
    createdAt: doc.meta.createdAt,
    nodeCount: Object.keys(doc.nodes).length,
    template: doc.meta.template,
  };
}
