import { z } from 'zod';

// Runs before any app module. Zod probes `new Function` when a schema is built
// to choose its JIT parser; under the page CSP (no 'unsafe-eval') the caught
// probe is still reported as a violation, so the interpreter is used instead.
z.config({ jitless: true });
