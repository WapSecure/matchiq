'use client';

import {
  cloneElement,
  type DOMAttributes,
  type ReactElement,
  type Ref,
  useRef,
} from 'react';
import { mergeProps, mergeRefs, useFocusable } from 'react-aria';

export type TargetElement = ReactElement<
  DOMAttributes<HTMLElement> & { ref?: Ref<HTMLElement>; tabIndex?: number }
>;

/**
 * Hands the tooltip trigger's hover and focus handlers to a plain element.
 * React Aria's `Focusable` does the same but warns in development whenever
 * the child is not visible at mount (a collapsed card, a responsive
 * `hidden` class), even though it is focusable once shown.
 */
export function TooltipTarget({ children }: { children: TargetElement }) {
  const ref = useRef<HTMLElement>(null);
  const { focusableProps } = useFocusable({}, ref);
  const own = children.props;
  return cloneElement(children, {
    ...mergeProps(own, focusableProps),
    // Native buttons and links are focusable already; keep their own order.
    tabIndex: own.tabIndex ?? focusableProps.tabIndex,
    ref: mergeRefs(ref, own.ref),
  });
}
