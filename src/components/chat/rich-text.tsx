import { Fragment } from "react";

/** Markdown mínimo do atendente: **negrito**, listas numeradas/marcadas e parágrafos. */
export function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-2.5">
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isOrdered = lines.every((l) => /^\s*\d+[.)]\s/.test(l));
        const isBullet = lines.every((l) => /^\s*[-•]\s/.test(l));
        if (isOrdered || isBullet) {
          const Tag = isOrdered ? "ol" : "ul";
          return (
            <Tag key={bi} className={isOrdered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
              {lines.map((l, li) => (
                <li key={li}>
                  <Inline text={l.replace(/^\s*(\d+[.)]|[-•])\s/, "")} />
                </li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 ? <br /> : null}
                <Inline text={l} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i} className="font-semibold">
            {p.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
