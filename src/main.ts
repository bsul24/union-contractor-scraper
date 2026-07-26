import { readUnionWorkbook } from "./input/readUnionWorkbook.js";

const result = await readUnionWorkbook("data/input/ua-locals.xlsx");

console.log(`Worksheet: ${result.sheetName}`);
console.log(`Imported ${result.locals.length} valid union rows.`);
console.log(`Found ${result.issues.length} import issue(s).`);

console.log("First union:", result.locals[0]);
console.log("Last valid union:", result.locals.at(-1));
console.log("Issues:", result.issues);
