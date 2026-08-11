export type { ZoomLevel, HarmonicFunction, RelationshipType, Explanation, HarmonicEdge } from "./types";
export { RELATIONSHIP_TYPES } from "./types";
export { chordIdentityKey, chordsEqual, sharedToneCount } from "./chordIdentity";
export { classifyFunction, diatonicDegreeOf, isDiatonicRoot, isTonic } from "./harmonicFunction";
export { leadingTone, functionalDominant, functionalLeadingToneDiminished } from "./functionalMinor";
export type { ContextualRole, ContextualRoleKind } from "./contextualRole";
export { contextualRole, isPlainDiatonicFunction } from "./contextualRole";

export { diatonicRelationships } from "./relationships/diatonic";
export { relativeRelationships } from "./relationships/relative";
export { functionalDominantRelationships } from "./relationships/functionalDominant";
export { diatonicSeventhChords, diatonicSeventhRelationships } from "./relationships/diatonicSeventh";
export type { SecondaryDominantTarget } from "./relationships/secondaryDominant";
export {
  dominantOf,
  isRecognizedDominant,
  secondaryDominantTargets,
  recognizedDominants,
  recognizedDominantSeventhChords,
  secondaryDominantRelationships,
  secondaryDominantChainRelationships,
} from "./relationships/secondaryDominant";
export { borrowedChords, borrowedRelationships } from "./relationships/borrowed";
export { substitutionRelationships } from "./relationships/substitution";
export { tritoneSubstitutionRelationships } from "./relationships/tritoneSubstitution";
export { passingDiminishedRelationships } from "./relationships/passingDiminished";
export { chromaticMediantRelationships } from "./relationships/chromaticMediant";
export { nearbyKeyRelationships } from "./relationships/nearbyKey";
export { commonToneRelationships } from "./relationships/commonTone";
export { distantKeyRelationships } from "./relationships/distantKey";
