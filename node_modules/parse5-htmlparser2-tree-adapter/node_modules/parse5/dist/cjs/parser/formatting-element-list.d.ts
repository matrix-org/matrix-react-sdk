import type { TagToken } from '../common/token.js';
import type { TreeAdapter, TreeAdapterTypeMap } from '../tree-adapters/interface';
export declare enum EntryType {
    Marker = 0,
    Element = 1
}
interface MarkerEntry {
    type: EntryType.Marker;
}
export interface ElementEntry<T extends TreeAdapterTypeMap> {
    type: EntryType.Element;
    element: T['element'];
    token: TagToken;
}
export declare type Entry<T extends TreeAdapterTypeMap> = MarkerEntry | ElementEntry<T>;
export declare class FormattingElementList<T extends TreeAdapterTypeMap> {
    private treeAdapter;
    entries: Entry<T>[];
    bookmark: Entry<T> | null;
    constructor(treeAdapter: TreeAdapter<T>);
    private _getNoahArkConditionCandidates;
    private _ensureNoahArkCondition;
    insertMarker(): void;
    pushElement(element: T['element'], token: TagToken): void;
    insertElementAfterBookmark(element: T['element'], token: TagToken): void;
    removeEntry(entry: Entry<T>): void;
    clearToLastMarker(): void;
    getElementEntryInScopeWithTagName(tagName: string): ElementEntry<T> | null;
    getElementEntry(element: T['element']): ElementEntry<T> | undefined;
}
export {};
//# sourceMappingURL=formatting-element-list.d.ts.map