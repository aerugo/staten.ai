import { Github } from "lucide-react";
import { App } from "@/types/components/app";

interface AppInformationProps {
  app: App;
}

export function AppInformation({ app }: AppInformationProps) {
  return (
    <section>
      <h2 className="text-xl font-semibold mb-6">Information</h2>
      <div className="grid grid-cols-2 gap-x-24 gap-y-8 text-sm max-w-2xl">
        <div>
          <dt className="text-gray-400 text-base mb-1">Utvecklare</dt>
          <dd className="text-gray-900 text-lg">{app.developer}</dd>
        </div>
        <div>
          <dt className="text-gray-400 text-base mb-1">Kategori</dt>
          <dd className="text-gray-900 text-lg">{app.category}</dd>
        </div>
        <div>
          <dt className="text-gray-400 text-base mb-1">Pris</dt>
          <dd className="text-gray-900 text-lg">{app.price}</dd>
        </div>
        <div>
          <dt className="text-gray-400 text-base mb-1">Storlek</dt>
          <dd className="text-gray-900 text-lg">104.8 MB</dd>
        </div>
        <div>
          <dt className="text-gray-400 text-base mb-1">Version</dt>
          <dd className="text-gray-900 text-lg">1.0.0</dd>
        </div>
        <div>
          <dt className="text-gray-400 text-base mb-1">=Kod</dt>
          <dd className="text-lg">
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer"
              className="text-gray-700 hover:text-gray-900 inline-flex items-center gap-1.5 group"
            >
              <Github className="w-5 h-5" />
              <span className="group-hover:underline">GitHub</span>
            </a>
          </dd>
        </div>
      </div>
    </section>
  );
}
