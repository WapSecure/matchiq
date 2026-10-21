import { runValidate } from './commands.js';
import { nodeIo } from './node-io.js';

process.exitCode = await runValidate(process.argv.slice(2), nodeIo);
