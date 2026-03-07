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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Crown, Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ADMIN_PRINCIPAL_ID } from "../../config/constants";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { useAddAdmin, useAdmins, useRemoveAdmin } from "../../hooks/useQueries";

export default function ManageAdminsSection() {
  const { data: admins = [], isLoading } = useAdmins();
  const addAdminMutation = useAddAdmin();
  const removeAdminMutation = useRemoveAdmin();
  const { identity } = useInternetIdentity();
  const [newPrincipal, setNewPrincipal] = useState("");
  const [removingPrincipal, setRemovingPrincipal] = useState<string | null>(
    null,
  );

  const callerPrincipal = identity?.getPrincipal().toString();

  // Always include the owner in the displayed list
  const ownerPrincipal = ADMIN_PRINCIPAL_ID;
  const adminPrincipals = admins.map((p) => p.toString());
  const displayAdmins = adminPrincipals.includes(ownerPrincipal)
    ? adminPrincipals
    : [ownerPrincipal, ...adminPrincipals];

  const handleAddAdmin = async () => {
    const trimmed = newPrincipal.trim();
    if (!trimmed) {
      toast.error("Ange ett giltigt principal-ID");
      return;
    }
    try {
      await addAdminMutation.mutateAsync(trimmed);
      toast.success("Admin har lagts till");
      setNewPrincipal("");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Unauthorized")) {
        toast.error("Endast ägaren kan lägga till admins");
      } else if (msg.includes("Invalid")) {
        toast.error("Ogiltigt principal-ID format");
      } else {
        toast.error("Kunde inte lägga till admin");
      }
    }
  };

  const handleRemoveAdmin = async (principalText: string) => {
    setRemovingPrincipal(principalText);
    try {
      await removeAdminMutation.mutateAsync(principalText);
      toast.success("Admin har tagits bort");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("owner")) {
        toast.error("Ägaren kan inte tas bort från adminlistan");
      } else {
        toast.error("Kunde inte ta bort admin");
      }
    } finally {
      setRemovingPrincipal(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Admin Form */}
      <div className="p-5 rounded-lg border border-border bg-card/50 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <UserPlus className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Lägg till ny admin</h3>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-principal" className="text-sm">
            Internet Identity Principal
          </Label>
          <p className="text-xs text-muted-foreground">
            Ange det exakta principal-ID:t för den person du vill ge
            adminbehörighet.
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            id="new-principal"
            value={newPrincipal}
            onChange={(e) => setNewPrincipal(e.target.value)}
            placeholder="xxxxx-xxxxx-xxxxx-xxxxx-xxx"
            className="font-mono text-sm"
            disabled={addAdminMutation.isPending}
          />
          <Button
            onClick={handleAddAdmin}
            disabled={addAdminMutation.isPending || !newPrincipal.trim()}
            className="shrink-0"
          >
            {addAdminMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Lägg till
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Admins List */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">
            Nuvarande admins ({displayAdmins.length})
          </h3>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Principal ID</TableHead>
                <TableHead>Roll</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayAdmins.map((principalText, idx) => {
                const isCurrentUser = principalText === callerPrincipal;
                const isOwner = principalText === ownerPrincipal;

                return (
                  <TableRow
                    key={principalText}
                    data-ocid={`admin.admins.item.${idx + 1}`}
                  >
                    <TableCell className="font-mono text-xs break-all max-w-[300px]">
                      {principalText}
                      {isCurrentUser && (
                        <span className="ml-2 text-muted-foreground">(du)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isOwner ? (
                        <Badge className="text-xs gap-1 bg-amber-500/20 text-amber-700 border-amber-500/30 hover:bg-amber-500/30">
                          <Crown className="h-3 w-3" />
                          Ägare
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {isOwner ? (
                        <span className="text-xs text-muted-foreground italic">
                          Kan ej tas bort
                        </span>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={removingPrincipal === principalText}
                              data-ocid={`admin.admins.delete_button.${idx + 1}`}
                            >
                              {removingPrincipal === principalText ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Ta bort admin</AlertDialogTitle>
                              <AlertDialogDescription>
                                Är du säker på att du vill ta bort
                                adminbehörigheten för{" "}
                                <strong className="font-mono text-xs break-all">
                                  {principalText}
                                </strong>
                                ?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Avbryt</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveAdmin(principalText)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Ta bort
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
