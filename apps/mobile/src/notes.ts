// apps/mobile/notes.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Note = { id: string; text: string; createdAt: number };
const KEY = "notes.v1";

export async function getNotes(): Promise<Note[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as Note[]) : [];
}

export async function addNote(text: string): Promise<Note[]> {
  const prev = await getNotes();
  const note: Note = { id: String(Date.now()), text, createdAt: Date.now() };
  const next = [note, ...prev];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export async function clearNotes(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
