import { useCallback, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { DEMO_STORAGE_KEY, INITIAL_DEMO_STATE } from "./business-demo";
import type { DemoState } from "./business-demo";

function loadDemoState(): DemoState {
    try {
        const stored = localStorage.getItem(DEMO_STORAGE_KEY);
        if (stored) return { ...INITIAL_DEMO_STATE, ...JSON.parse(stored) } as DemoState;
    } catch {
        // Private browsing or stale demo data should not prevent the page from opening.
    }
    return INITIAL_DEMO_STATE;
}

export function useDemoState(): [DemoState, Dispatch<SetStateAction<DemoState>>] {
    const [state, setState] = useState<DemoState>(loadDemoState);
    const stateRef = useRef(state);

    const setDemoState = useCallback<Dispatch<SetStateAction<DemoState>>>((update) => {
        const next = typeof update === "function" ? update(stateRef.current) : update;
        stateRef.current = next;
        try {
            localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(next));
        } catch {
            // Demo interactions still work for the current mounted page without storage.
        }
        setState(next);
    }, []);

    return [state, setDemoState];
}
