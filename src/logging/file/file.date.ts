export interface FileDateOptions {
    utc?: boolean;
    includeMilliseconds?: boolean;
}

export function formatFileDate(time: number | Date, options: FileDateOptions = {}): string {
    const date = time instanceof Date ? time : new Date(time);
    const utc = options.utc ?? false;
    const includeMilliseconds = options.includeMilliseconds ?? true;

    const year = utc ? date.getUTCFullYear() : date.getFullYear();
    const month = (utc ? date.getUTCMonth() : date.getMonth()) + 1;
    const day = utc ? date.getUTCDate() : date.getDate();
    const hour = utc ? date.getUTCHours() : date.getHours();
    const minute = utc ? date.getUTCMinutes() : date.getMinutes();
    const second = utc ? date.getUTCSeconds() : date.getSeconds();
    const millisecond = utc ? date.getUTCMilliseconds() : date.getMilliseconds();

    const stamp = [
        `${year}`,
        String(month).padStart(2, '0'),
        String(day).padStart(2, '0'),
    ].join('-') + '_' + [
        String(hour).padStart(2, '0'),
        String(minute).padStart(2, '0'),
        String(second).padStart(2, '0'),
    ].join('-');

    if (!includeMilliseconds) {
        return utc ? `${stamp}_UTC` : stamp;
    }

    const withMilliseconds = `${stamp}.${String(millisecond).padStart(3, '0')}`;
    return utc ? `${withMilliseconds}_UTC` : withMilliseconds;
}