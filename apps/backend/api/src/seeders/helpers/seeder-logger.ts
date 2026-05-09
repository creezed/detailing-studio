export function seederLog(label: string, message: string): void {
  const ts = new Date().toISOString().slice(11, 19);

  process.stdout.write(`[${ts}] [${label}] ${message}\n`);
}
