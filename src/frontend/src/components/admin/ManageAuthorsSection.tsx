import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Ban, Loader2, Trash2, Undo2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useGetAuthors, useRemoveAuthor } from "../../hooks/useQueries";
import {
  blockAuthor,
  getBlockedAuthors,
  isAuthorBlocked,
  unblockAuthor,
} from "../../lib/blockedAuthors";

export default function ManageAuthorsSection() {
  const { data: authors = [], isLoading } = useGetAuthors();
  const removeAuthorMutation = useRemoveAuthor();
  const [removingPrincipal, setRemovingPrincipal] = useState<string | null>(
    null,
  );
  const [blockingPrincipal, setBlockingPrincipal] = useState<string | null>(
    null,
  );
  // Track local block state so UI re-renders without page reload
  const [blockedList, setBlockedList] = useState<string[]>(() =>
    getBlockedAuthors(),
  );

  const refreshBlockedList = () => setBlockedList(getBlockedAuthors());

  const handleRemoveAuthor = async (
    principalText: string,
    displayName: string,
  ) => {
    setRemovingPrincipal(principalText);
    try {
      await removeAuthorMutation.mutateAsync(principalText);
      toast.success(
        `Författaren "${displayName}" och alla deras inlägg har tagits bort`,
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Kunde inte ta bort författaren";
      toast.error(msg);
    } finally {
      setRemovingPrincipal(null);
    }
  };

  const handleBlockAuthor = (principalText: string, displayName: string) => {
    setBlockingPrincipal(principalText);
    try {
      blockAuthor(principalText);
      refreshBlockedList();
      toast.success(
        `Författaren "${displayName}" är nu blockerad. Deras inlägg döljs för alla besökare.`,
      );
    } finally {
      setBlockingPrincipal(null);
    }
  };

  const handleUnblockAuthor = (principalText: string, displayName: string) => {
    unblockAuthor(principalText);
    refreshBlockedList();
    toast.success(`Blockering av "${displayName}" är upphävd.`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <p className="text-sm text-muted-foreground">
          {authors.length} unika{" "}
          {authors.length === 1 ? "författare" : "författare"} hittades
        </p>
      </div>

      {authors.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground text-sm"
          data-ocid="admin.authors.empty_state"
        >
          Inga författare hittades.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead>Principal ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authors.map((author) => {
                const principalText = author.principal.toString();
                const blocked = blockedList.includes(principalText);
                return (
                  <TableRow key={principalText}>
                    <TableCell className="font-medium">
                      {author.displayName}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground break-all max-w-[200px]">
                      {principalText}
                    </TableCell>
                    <TableCell>
                      {blocked ? (
                        <Badge variant="destructive" className="text-xs">
                          Blockerad
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Aktiv
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Block / Unblock */}
                        {blocked ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs"
                            onClick={() =>
                              handleUnblockAuthor(
                                principalText,
                                author.displayName,
                              )
                            }
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            Häv blockering
                          </Button>
                        ) : (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50 hover:text-amber-800"
                                disabled={blockingPrincipal === principalText}
                              >
                                {blockingPrincipal === principalText ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <Ban className="h-3.5 w-3.5" />
                                )}
                                Blockera
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Blockera författare
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Är du säker på att du vill blockera{" "}
                                  <strong>"{author.displayName}"</strong>? Deras
                                  publicerade inlägg döljs för besökare och de
                                  kan inte publicera nya inlägg. Du kan häva
                                  blockeringen när som helst.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() =>
                                    handleBlockAuthor(
                                      principalText,
                                      author.displayName,
                                    )
                                  }
                                  className="bg-amber-600 text-white hover:bg-amber-700"
                                >
                                  Blockera författare
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {/* Remove author & all posts */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                              disabled={removingPrincipal === principalText}
                            >
                              {removingPrincipal === principalText ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="h-4 w-4" />
                                  Ta bort
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Ta bort författare
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Är du säker på att du vill ta bort författaren{" "}
                                <strong>"{author.displayName}"</strong>? Alla
                                deras inlägg kommer att raderas permanent. Denna
                                åtgärd kan inte ångras.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleRemoveAuthor(
                                    principalText,
                                    author.displayName,
                                  )
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Ta bort författare och alla inlägg
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
