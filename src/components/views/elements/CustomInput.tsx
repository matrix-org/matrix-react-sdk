import React, { useRef, useEffect } from 'react';

// via https://itnext.io/reusing-the-ref-from-forwardref-with-react-hooks-4ce9df693dd
function useCombinedRefs(...refs) {
    const targetRef = useRef()

    useEffect(() => {
        refs.forEach(ref => {
            if (!ref) return

            if (typeof ref === 'function') {
                ref(targetRef.current)
            } else {
                ref.current = targetRef.current
            }
        })
    }, [refs])

    return targetRef
}

interface CustomInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onInput'> {
    onChange?: (event: Event) => void;
    onInput?: (event: Event) => void;
}
/**
* This component restores the native 'onChange' and 'onInput' behavior of
* JavaScript. via https://stackoverflow.com/a/62383569/796832 and
* https://github.com/facebook/react/issues/9657#issuecomment-643970199
*
* See:
* - https://reactjs.org/docs/dom-elements.html#onchange
* - https://github.com/facebook/react/issues/3964
* - https://github.com/facebook/react/issues/9657
* - https://github.com/facebook/react/issues/14857
*
* We use this for the <input type="date"> date picker so we can distinguish
* from a final date picker selection vs navigating the months in the date
* picker which trigger an `input`(and `onChange` in React).
*/
const CustomInput = React.forwardRef((props: CustomInputProps, ref) => {
    const registerCallbacks = (input: HTMLInputElement | null) => {
        if (input) {
            input.onchange = props.onChange;
            input.oninput = props.onInput;
        }
    };

    return <input
        ref={useCombinedRefs(registerCallbacks, ref)}
        {...props}
        // These are just here so we don't get a read-only input warning from React
        onChange={() => {}}
        onInput={() => {}}
    />;
});

export default CustomInput;
