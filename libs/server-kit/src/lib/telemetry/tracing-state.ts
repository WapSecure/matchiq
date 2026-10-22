let tracingActive = false;

/** Set by `startTracing`, or by a test that registers its own provider. */
export const markTracingActive = (active: boolean): void => {
  tracingActive = active;
};

export const isTracingActive = (): boolean => tracingActive;
