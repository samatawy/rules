import type { LoggedEvent } from "..";

/**
 * LoggedEventFormatter class is responsible for formatting strings based on a template string and a LoggedEvent object.
 * The template can contain placeholders in the format {key} which will be replaced by corresponding values from the LoggedEvent object.
 * It also supports optional blocks in the format [? ... ] which will only be included in the final message if all placeholders within them have corresponding data values.
 * This allows for flexible and dynamic log message formatting based on the available data.
 */
export class LoggedEventFormatter {

    private _template: string;

    private static numberFmt = new Intl.NumberFormat('en-US', { notation: 'standard', maximumFractionDigits: 3 }).format;

    /**
     * Set up a LoggedEventFormatter with a given template string.
     * @param template the template string to use for formatting messages.
     * @returns the LoggedEventFormatter instance for chaining.
     */
    public static using(template: string): LoggedEventFormatter {
        return new LoggedEventFormatter(template);
    }

    /**
     * Create a new LoggedEventFormatter instance with the given template string.
     * @param template the template string to use for formatting messages.
     */
    constructor(template: string) {
        this._template = template;
    }

    // Replace placeholders in the template with corresponding values from the data object.
    // Split template into parts by surrounding optional blocks [? ... ]
    // These blocks will only be included in the final message if all placeholders within them have corresponding data values.
    public format(event: LoggedEvent): string {
        let result = this._template + '';

        // First, detect optional blocks and determine if they should be included based on the presence of their placeholders in the event data.
        let blocks = this._template.matchAll(/(\[\?.+?\])/g);
        for (const block of blocks) {
            const blockStr = block[0];
            const placeholders = blockStr.matchAll(/{(\w+?)}/g);
            let includeBlock = true;
            for (const placeholder of placeholders) {
                const key = placeholder[1];
                if (key == undefined) {
                    includeBlock = false;
                    break;
                }
                if (['timestamp', 'level', 'message'].includes(key)) {
                    continue; // These keys are always available on LoggedEvent
                }
                if (Number.isNaN(Number(key))) {
                    continue; // Non-numeric keys are not expected to be in args, so we can skip them
                } else {
                    const index = Number(key);
                    if (index < event.args.length) {
                        continue; // This arg index exists, so we can include the block
                    } else {
                        includeBlock = false; // Missing arg index, exclude the block
                        break;
                    }
                }
            }
            if (includeBlock) {
                result = result.replace(blockStr, blockStr.slice(2, -1)); // Remove the surrounding [? and ]
            } else {
                result = result.replace(blockStr, ''); // Remove the entire block
            }
        }

        // Next, replace all remaining placeholders with their corresponding values from the event data.
        const placeholders = result.matchAll(/{(\w+?)}/g);
        for (const placeholder of placeholders) {
            const key = placeholder[1];
            if (key == undefined) {
                result = result.replace(placeholder[0], '');
                continue;
            }
            switch (key) {
                case 'timestamp':
                    const timestamp = new Date(event.timestamp);
                    result = result.replace(placeholder[0], timestamp.toISOString());
                    continue;
                case 'level':
                    result = result.replace(placeholder[0], event.level.toUpperCase());
                    continue;
                case 'message':
                    result = result.replace(placeholder[0], event.message);
                    continue;
            }
            if (Number.isNaN(Number(key))) {
                continue;
            } else {
                const index = Number(key);
                if (index < event.args.length) {
                    const value = event.args[index];
                    const formattedValue = this.formatVar(value);
                    result = result.replace(placeholder[0], formattedValue);
                } else {
                    result = result.replace(placeholder[0], '');
                }
            }
        }
        return result;
    }

    private formatVar(value: any): string {
        const t = typeof value;

        if (t === 'string') return value;
        if (t === 'boolean') return value ? 'true' : 'false';

        if (t === 'number') {
            // Fast timestamp heuristic: likely ms since epoch (1970)
            // Range: > Nov 1973 (1e11) and < year 500k (1e16)
            if (value > 1e11 && value < 1e16) {
                return new Date(value).toISOString();
            } else {
                return LoggedEventFormatter.numberFmt(value);
            }
        }

        if (t === 'object' && value !== null) {
            // instanceof Date is ~2x faster than Object.prototype.toString.call()
            // ⚠️ Fails across iframes/Web Workers. Use fallback if cross-realm.
            if (value instanceof Date) return value.toISOString();
        }

        return value;
    }
}