export default class Utilities {
    static formatLocalDateTime(): string {
        return new Date().toLocaleString().replace(', ', ' ');
    }

    static getCurrentDateISO(): string {
        return new Date().toISOString().slice(0, 10);
    }
}