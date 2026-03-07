import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";
import { useGetModerationLog } from "../../hooks/useQueries";

function formatSwedishDate(timestamp: bigint): string {
  const ms = Number(timestamp / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function shortenPrincipal(principal: { toString(): string }): string {
  const str = principal.toString();
  if (str.length <= 16) return str;
  return `${str.slice(0, 8)}…${str.slice(-6)}`;
}

export default function ModerationLogSection() {
  const {
    data: log = [],
    isLoading,
    isError,
    isFetched,
  } = useGetModerationLog();

  if (isLoading) {
    return (
      <div
        className="flex items-center gap-3 py-16 justify-center text-muted-foreground"
        data-ocid="moderation.loading_state"
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Laddar modereringslogg...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex items-center gap-3 py-16 justify-center text-destructive"
        data-ocid="moderation.error_state"
      >
        <AlertTriangle className="h-5 w-5" />
        <span className="text-sm">Kunde inte hämta modereringsloggen.</span>
      </div>
    );
  }

  if (isFetched && log.length === 0) {
    return (
      <div
        className="flex flex-col items-center gap-3 py-20 text-center text-muted-foreground"
        data-ocid="moderation.empty_state"
      >
        <div className="p-3 rounded-full bg-muted/60">
          <ShieldAlert className="h-8 w-8 text-muted-foreground/60" />
        </div>
        <p className="text-sm">Inget blockerat innehåll hittades.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <h2 className="text-lg font-semibold text-foreground">
          Blockerat innehåll
        </h2>
        <Badge variant="destructive" className="text-xs">
          {log.length}
        </Badge>
      </div>

      <ScrollArea className="rounded-lg border border-border/40">
        <div data-ocid="moderation.table">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-24 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Typ
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Innehåll
                </TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Anledning
                </TableHead>
                <TableHead className="w-36 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Författare
                </TableHead>
                <TableHead className="w-44 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Datum
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.map((entry, i) => (
                <TableRow
                  key={entry.id.toString()}
                  className="hover:bg-destructive/5 border-border/30"
                  data-ocid={`moderation.row.${i + 1}`}
                >
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className="text-xs border-destructive/30 text-destructive bg-destructive/5 capitalize"
                    >
                      {entry.contentType}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 max-w-xs">
                    <p className="text-sm text-foreground/80 line-clamp-2 font-mono text-xs bg-muted/40 rounded px-2 py-1">
                      {entry.contentSnippet.slice(0, 80)}
                      {entry.contentSnippet.length > 80 ? "…" : ""}
                    </p>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground/90">
                        {entry.reason}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <code className="text-xs text-muted-foreground font-mono bg-muted/40 px-1.5 py-0.5 rounded">
                      {shortenPrincipal(entry.authorPrincipal)}
                    </code>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {formatSwedishDate(entry.createdAt)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
