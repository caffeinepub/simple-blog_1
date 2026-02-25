import { useState } from 'react';
import { useAdmins, useAddAdmin, useRemoveAdmin } from '../../hooks/useQueries';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
} from '@/components/ui/alert-dialog';
import { Loader2, UserPlus, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageAdminsSection() {
  const { data: admins = [], isLoading } = useAdmins();
  const addAdminMutation = useAddAdmin();
  const removeAdminMutation = useRemoveAdmin();
  const { identity } = useInternetIdentity();
  const [newPrincipal, setNewPrincipal] = useState('');
  const [removingPrincipal, setRemovingPrincipal] = useState<string | null>(null);

  const callerPrincipal = identity?.getPrincipal().toString();

  const handleAddAdmin = async () => {
    const trimmed = newPrincipal.trim();
    if (!trimmed) {
      toast.error('Ange ett giltigt principal-ID');
      return;
    }
    try {
      await addAdminMutation.mutateAsync(trimmed);
      toast.success('Admin har lagts till');
      setNewPrincipal('');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Unauthorized')) {
        toast.error('Endast ägaren kan lägga till admins');
      } else if (msg.includes('Invalid')) {
        toast.error('Ogiltigt principal-ID format');
      } else {
        toast.error('Kunde inte lägga till admin');
      }
    }
  };

  const handleRemoveAdmin = async (principalText: string) => {
    setRemovingPrincipal(principalText);
    try {
      await removeAdminMutation.mutateAsync(principalText);
      toast.success('Admin har tagits bort');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('owner')) {
        toast.error('Ägaren kan inte tas bort från adminlistan');
      } else {
        toast.error('Kunde inte ta bort admin');
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
            Ange det exakta principal-ID:t för den person du vill ge adminbehörighet.
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
          <h3 className="font-medium text-sm">Nuvarande admins ({admins.length})</h3>
        </div>

        {admins.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Inga admins hittades.
          </div>
        ) : (
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
                {admins.map((principal) => {
                  const principalText = principal.toString();
                  const isCurrentUser = principalText === callerPrincipal;

                  return (
                    <TableRow key={principalText}>
                      <TableCell className="font-mono text-xs break-all max-w-[300px]">
                        {principalText}
                        {isCurrentUser && (
                          <span className="ml-2 text-muted-foreground">(du)</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          Admin
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={removingPrincipal === principalText}
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
                                Är du säker på att du vill ta bort adminbehörigheten för{' '}
                                <strong className="font-mono text-xs break-all">{principalText}</strong>?
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
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
