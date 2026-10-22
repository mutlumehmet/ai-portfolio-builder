import { IframeEmbed } from "@/components/iframe-embed";
import { LightboxImage } from "@/components/lightbox-image";
import { parseBlockData, type BlockType } from "@/lib/blocks";
import { siteConfig } from "@/lib/config";
import { cn } from "@/lib/utils";

type Block = {
  id: string;
  order: number;
  type: string;
  data: unknown;
};

function Heading({ data }: { data: unknown }) {
  const { text, level } = parseBlockData("heading", data);
  const Tag = level === 3 ? "h3" : "h2";
  return (
    <Tag className="mt-10 mb-4 text-2xl font-black tracking-tight first:mt-0 md:text-3xl">
      {text}
    </Tag>
  );
}

function Paragraph({ data }: { data: unknown }) {
  const { text } = parseBlockData("paragraph", data);
  return (
    <p className="mb-5 max-w-[65ch] leading-relaxed text-foreground/85">
      {text.split(/(https:\/\/\S+)/).map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all font-bold text-primary underline underline-offset-2"
          >
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}

function ImageBlock({ data }: { data: unknown }) {
  const { url, alt, caption } = parseBlockData("image", data);
  return (
    <figure className="mb-6 flex flex-col items-center">
      <div className="inline-block overflow-hidden rounded-lg border-2 border-border shadow-brutal">
        <LightboxImage src={url} alt={alt} />
      </div>
      {caption ? (
        <figcaption className="mt-2 text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function DiagramBlock({ data }: { data: unknown }) {
  const { url, alt, caption } = parseBlockData("diagram", data);
  return (
    <figure className="mb-6 flex flex-col items-center">
      <div className="inline-block overflow-hidden rounded-lg border-2 border-border bg-card shadow-brutal">
        <LightboxImage src={url} alt={alt} padded />
      </div>
      {caption ? (
        <figcaption className="mt-2 text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function YoutubeBlock({ data }: { data: unknown }) {
  const { videoId, caption } = parseBlockData("youtube", data);
  return (
    <figure className="mb-6">
      <IframeEmbed
        src={`https://www.youtube-nocookie.com/embed/${videoId}`}
        title={caption ?? "Project video"}
        aspectClassName="aspect-video"
      />
      {caption ? (
        <figcaption className="mt-2 text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

const aspectClass: Record<string, string> = {
  "16:9": "aspect-video",
  "1:1": "aspect-square",
  "4:3": "aspect-[4/3]",
};

// Same-site paths (like /embed/video.html) are always allowed. Other URLs must
// be https, and on the allowlist in site.config.ts when that list is not empty.
function embedAllowed(url: string) {
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    const hosts = siteConfig.embeds.allowedHosts;
    return hosts.length === 0 || hosts.includes(parsed.hostname);
  } catch {
    return false;
  }
}

function EmbedBlock({ data }: { data: unknown }) {
  const { url, aspectRatio, caption } = parseBlockData("embed", data);
  if (!embedAllowed(url)) {
    return (
      <p className="mb-6 text-sm text-muted-foreground">
        Embedded content is not allowed from this address
        {url.startsWith("https://") ? (
          <>
            :{" "}
            <a href={url} target="_blank" rel="noopener noreferrer" className="font-bold underline">
              open it in a new tab
            </a>
          </>
        ) : null}
        .
      </p>
    );
  }
  return (
    <figure className="mb-6">
      <IframeEmbed
        src={url}
        title={caption ?? "Embedded content"}
        aspectClassName={aspectClass[aspectRatio]}
      />
      {caption ? (
        <figcaption className="mt-2 text-sm text-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function CodeBlock({ data }: { data: unknown }) {
  const { code, language } = parseBlockData("code", data);
  return (
    <div className="mb-6 overflow-hidden rounded-lg border-2 border-border shadow-brutal">
      {language ? (
        <div className="border-b-2 border-border bg-foreground px-4 py-1.5 font-mono text-xs font-bold text-background">
          {language}
        </div>
      ) : null}
      <pre className="overflow-x-auto bg-card p-4 font-mono text-sm">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const renderers: Record<string, (props: { data: unknown }) => React.ReactNode> = {
  heading: Heading,
  paragraph: Paragraph,
  image: ImageBlock,
  diagram: DiagramBlock,
  youtube: YoutubeBlock,
  code: CodeBlock,
  embed: EmbedBlock,
};

export function BlockRenderer({
  blocks,
  className,
}: {
  blocks: Block[];
  className?: string;
}) {
  return (
    <div className={cn(className)}>
      {[...blocks]
        .sort((a, b) => a.order - b.order)
        .map((block) => {
          const Renderer = renderers[block.type as BlockType];
          if (!Renderer) return null;
          return <Renderer key={block.id} data={block.data} />;
        })}
    </div>
  );
}
