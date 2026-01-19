// services/fs.ts
import { collection, doc, getDoc, getDocs, query, where, orderBy, limit, startAfter, startAt, endAt, onSnapshot, QueryConstraint, QueryDocumentSnapshot, DocumentData, WhereFilterOp } from "firebase/firestore";
import { db } from "../firebase-config";

// Readable, self-documenting types
export type Where = { field: string; op: WhereFilterOp | any; value: any };
export type Order = { field: string; dir?: "asc" | "desc" };
export type TextSearch = { field: string; text: string }; // prefix search (requires lowercased field)

export type PageArgs = {
  path: string; // "products", "shops", or `users/${uid}/orders`
  where?: Where[]; // [{ field:"category", op:"==", value:"bread" }]
  orderBy?: Order | Order[]; // { field:"createdAt", dir:"desc" }
  pageSize?: number; // default 20
  cursor?: QueryDocumentSnapshot | null;
  search?: TextSearch | null; // { field:"name_lower", text:"cro" }
};

// Build Firestore constraints from friendly args
function buildConstraints(args: PageArgs) {
  const cs: QueryConstraint[] = [];
  (args.where ?? []).forEach((w) => cs.push(where(w.field as any, w.op, w.value)));
  const orders = args.orderBy ? (Array.isArray(args.orderBy) ? args.orderBy : [args.orderBy]) : [];
  orders.forEach((o) => cs.push(orderBy(o.field, o.dir)));
  if (args.pageSize) cs.push(limit(args.pageSize));
  return cs;
}

// Page query (works for any collection)
export async function queryPage<T = any>(args: PageArgs) {
  const cs = buildConstraints(args);
  let qBase = query(collection(db, args.path), ...cs);
  if (args.cursor) qBase = query(qBase, startAfter(args.cursor));

  // Optional prefix search (ensure orderBy includes search.field!)
  if (args.search?.text?.trim()) {
    const s = args.search.text.trim().toLowerCase();
    qBase = query(qBase, startAt(s), endAt(s + "\uf8ff"));
  }

  const snap = await getDocs(qBase);
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[];
  const nextCursor = snap.docs.at(-1) ?? null;
  return { items, nextCursor };
}

// Single doc
export async function getDocById<T = any>(path: string, id: string): Promise<T | null> {
  const d = await getDoc(doc(collection(db, path), id));
  return d.exists() ? ({ id: d.id, ...(d.data() as any) } as T) : null;
}

// Live (realtime) subscription (list)
export function subscribeList<T = any>(args: Omit<PageArgs, "cursor" | "pageSize">, cb: (items: T[]) => void, err?: (e: any) => void) {
  const cs = buildConstraints({ ...args, pageSize: undefined, cursor: undefined });
  let qBase = query(collection(db, args.path), ...cs);
  if (args.search?.text?.trim()) {
    const s = args.search.text.trim().toLowerCase();
    qBase = query(qBase, startAt(s), endAt(s + "\uf8ff"));
  }
  return onSnapshot(qBase, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as T[]), err);
}
