
export function parseCSV(csv: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    while (i < csv.length) {
        const char = csv[i];
        if (inQuotes) {
            if (char === '"') {
                if (csv[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                row.push(field);
                field = '';
            } else if (char === '\n' || char === '\r') {
                if (field.length > 0 || row.length > 0) {
                    row.push(field);
                    field = '';
                }
                if (row.length > 0) {
                    rows.push(row);
                    row = [];
                }
                // Handle \r\n (Windows newlines)
                if (char === '\r' && csv[i + 1] === '\n') i++;
            } else {
                field += char;
            }
        }
        i++;
    }
    if (field.length > 0 || row.length > 0) {
        row.push(field);
        rows.push(row);
    }
    return rows;
}
