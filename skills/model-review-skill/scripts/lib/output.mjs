import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export async function writeJsonAtomic(target, value) {
  const absolute = path.resolve(target);
  await mkdir(path.dirname(absolute), { recursive: true });
  const temporary = `${absolute}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  await rename(temporary, absolute);
  return absolute;
}
