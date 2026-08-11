import {
  addItem,
  removeItem,
  reorderItem,
  setItemDuration,
  setBpm,
  setTimeSignature,
  clearProgression,
  transposeProgression,
  createEmptyProgression,
  type Progression,
  type ProgressionItem,
  type TimeSignature,
} from "@/domain/progression";

/**
 * `ADD` carries an already-built `ProgressionItem` rather than a bare
 * `Chord` — id generation is impure (see
 * `../../domain/progression/progression.ts`'s `createProgressionItem`), and
 * a `useReducer` reducer must stay pure (React may invoke it more than once
 * per dispatch in development/Strict Mode). Callers build the item in their
 * event handler, then dispatch it.
 */
export type ProgressionAction =
  | { type: "ADD"; item: ProgressionItem }
  | { type: "REMOVE"; id: string }
  | { type: "REORDER"; fromIndex: number; toIndex: number }
  | { type: "SET_DURATION"; id: string; durationBeats: number }
  | { type: "SET_BPM"; bpm: number }
  | { type: "SET_TIME_SIGNATURE"; timeSignature: TimeSignature }
  | { type: "CLEAR" }
  | { type: "TRANSPOSE"; semitones: number };

export function initialProgressionState(): Progression {
  return createEmptyProgression();
}

export function progressionReducer(state: Progression, action: ProgressionAction): Progression {
  switch (action.type) {
    case "ADD":
      return addItem(state, action.item);
    case "REMOVE":
      return removeItem(state, action.id);
    case "REORDER":
      return reorderItem(state, action.fromIndex, action.toIndex);
    case "SET_DURATION":
      return setItemDuration(state, action.id, action.durationBeats);
    case "SET_BPM":
      return setBpm(state, action.bpm);
    case "SET_TIME_SIGNATURE":
      return setTimeSignature(state, action.timeSignature);
    case "CLEAR":
      return clearProgression(state);
    case "TRANSPOSE":
      return transposeProgression(state, action.semitones);
    default:
      return state;
  }
}
