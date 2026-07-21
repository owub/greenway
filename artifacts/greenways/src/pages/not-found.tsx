import { Link } from "wouter";

export default function NotFound() {
  return (
    <main className="terminal-screen flex min-h-screen items-center justify-center p-4">
      <section className="terminal-window w-full max-w-xl p-5 text-sm">
        <p>
          <span className="text-terminal-green">root@hate</span>
          <span className="text-terminal-dim">:</span>
          <span className="text-terminal-cyan">~</span>
          <span className="text-terminal-dim">$</span> cd {window.location.pathname}
        </p>
        <p className="mt-3 text-terminal-red">bash: no such file or directory</p>
        <Link href="/" className="mt-6 inline-flex text-terminal-green hover:underline">
          return to /
        </Link>
      </section>
    </main>
  );
}
