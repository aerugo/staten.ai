import { App } from "@/types/components/app";

interface AppDescriptionProps {
  app: App;
}

export function AppDescription({ app }: AppDescriptionProps) {
  const features = app.features;

  return (
    <section>
      <div className="flex gap-6 h-full">
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-2">Exempel</h2>
          <div className="grid grid-cols-2 gap-4">
            {features?.map((feature) => (
              <div
                key={feature.name}
                className="bg-sand rounded-lg p-4 flex flex-col gap-2"
              >
                <p className="text-sm font-semibold">{feature.name}</p>
                <p className="text-sm leading-relaxed italic text-zinc-600 dark:text-zinc-400">
                  "{feature.prompt}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
