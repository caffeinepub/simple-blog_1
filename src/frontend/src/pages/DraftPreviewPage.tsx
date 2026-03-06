import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, Calendar, Eye, Loader2, User } from "lucide-react";
import ImageGallery from "../components/ImageGallery";
import { useGetDraft } from "../hooks/useQueries";
import { formatDate } from "../utils/dateFormatter";

export default function DraftPreviewPage() {
  const { id } = useParams({ from: "/draft/$id/preview" });
  const navigate = useNavigate();
  const { data: draft, isLoading, error } = useGetDraft(BigInt(id));

  if (isLoading) {
    return (
      <div
        className="container max-w-4xl mx-auto px-6 py-16"
        data-ocid="draft_preview.loading_state"
      >
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error || !draft) {
    return (
      <div
        className="container max-w-4xl mx-auto px-6 py-16"
        data-ocid="draft_preview.error_state"
      >
        <div className="text-center py-20">
          <p className="text-destructive mb-6">
            Utkastet hittades inte eller kunde inte laddas.
          </p>
          <Button
            onClick={() => navigate({ to: "/drafts" })}
            variant="outline"
            data-ocid="draft_preview.cancel_button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tillbaka till utkast
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-6 py-16">
      {/* Back navigation */}
      <Button
        onClick={() => navigate({ to: "/drafts" })}
        variant="ghost"
        size="sm"
        className="-ml-2 mb-6 text-muted-foreground hover:text-foreground"
        data-ocid="draft_preview.cancel_button"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Tillbaka till utkast
      </Button>

      {/* Preview banner */}
      <div className="mb-8 flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/6 px-5 py-3.5 shadow-sm">
        <span className="flex items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-3 py-1 text-xs font-bold tracking-widest text-primary uppercase">
          <Eye className="h-3.5 w-3.5" />
          Förhandsgranskning
        </span>
        <p className="text-sm text-foreground/70">
          Så här ser ditt inlägg ut för läsarna — detta är ett opublicerat
          utkast.
        </p>
      </div>

      {/* Post article — mirrors authenticated PostDetailPage layout */}
      <article>
        <header className="mb-12 pb-8 border-b border-border/40">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif font-bold text-foreground mb-6 leading-tight tracking-tight">
            {draft.title || (
              <span className="text-muted-foreground italic">(Utan titel)</span>
            )}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-medium">
                {draft.author || (
                  <span className="italic">Okänd författare</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <time
                dateTime={new Date(
                  Number(draft.createdAt) / 1000000,
                ).toISOString()}
              >
                {formatDate(draft.createdAt)}
              </time>
            </div>
          </div>
        </header>

        {/* Images */}
        {draft.images && draft.images.length > 0 && (
          <ImageGallery images={draft.images as Uint8Array[]} />
        )}

        {/* Content */}
        <div className="prose prose-lg prose-stone dark:prose-invert max-w-none mb-10">
          {draft.content ? (
            <div
              className="rich-content leading-relaxed text-foreground opacity-90"
              // biome-ignore lint/security/noDangerouslySetInnerHtml: controlled rich text from Quill editor
              dangerouslySetInnerHTML={{ __html: draft.content }}
            />
          ) : (
            <span className="text-muted-foreground italic">
              Inget innehåll ännu...
            </span>
          )}
        </div>
      </article>

      {/* Bottom back button */}
      <div className="pt-6 border-t border-border/30">
        <Button
          onClick={() => navigate({ to: "/drafts" })}
          variant="outline"
          className="gap-2"
          data-ocid="draft_preview.secondary_button"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till utkast
        </Button>
      </div>
    </div>
  );
}
