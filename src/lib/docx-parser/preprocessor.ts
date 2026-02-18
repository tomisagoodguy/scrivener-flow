
import mammoth from 'mammoth';

export async function processRawDocx(buffer: Buffer): Promise<{ rawText: string; flatText: string }> {
    // Use raw text but try to preserve line structure if possible.
    // Mammoth extractRawText usually puts paragraphs on newlines.
    // Use convertToHtml to preserve Table structure
    // Python script: Iterates rows, commas between cells.
    // Mammoth extractRawText destroys table structure (just paragraphs).
    // converting to HTML allows us to see <tr> and <td>.
    const result = await mammoth.convertToHtml({ buffer });
    let html = result.value;

    // Simulate "formatted text" by converting HTML table markers to separators
    // 1. Replace cell endings with commas
    html = html.replace(/<\/td>|<\/th>/gi, ',');
    // 2. Replace row endings with newlines
    html = html.replace(/<\/tr>/gi, '\n');
    // 3. Replace <p> endings with spaces (start of p usually implies new line in text, but inside cell we want space)
    html = html.replace(/<\/p>/gi, ' ');
    // 4. Replace <br> with spaces
    html = html.replace(/<br\s*\/?>/gi, ' ');

    // 5. Strip all other tags
    let rawText = html.replace(/<[^>]+>/g, '');

    // Decode HTML entities (basic ones)
    rawText = rawText
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

    // "Flat Text" for global regexes (still useful, but now rawText has structure)
    // We update flatText to be consistent with the structured rawText but single-lined
    const flatText = rawText.replace(/\s+/g, ' ').trim();

    return { rawText, flatText };
}
