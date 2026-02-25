import { useState } from 'react';
import { useGetAuthors, useRemoveAuthor } from '../../hooks/useQueries';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Loader2, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ManageAuthorsSection() {
  const { data: authors = [], isLoading } = useGetAuthors();
  const removeAuthorMutation = useRemoveAuthor();
  const [removingPrincipal, setRemovingPrincipal] = useState<string | null>(null);

  const handleRemoveAuthor = async (principalText: string, displayName: string) => {
    setRemovingPrincipal(principalText);
    try {
      await removeAuthorMutation.mutateAsync(principalText);
      toast.success(`Författaren "${displayName}" och alla deras inlägg har tagits bort`);
    } catch (err) {
      toast.error('Kunde inte ta bort författaren');
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary" />
        <p className="text-sm text-muted-foreground">
          {authors.length} unika {authors.length === 1 ? 'författare' : 'författare'} hittades
        </p>
      </div>

      {authors.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          Inga författare hittades.
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Namn</TableHead>
                <TableHead>Principal ID</TableHead>
                <TableHead className="text-right">Åtgärder</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {authors.map((author) => {
                const principalText = author.principal.toString();
                return (
                  <TableRow key={principalText}>
                    <TableCell className="font-medium">{author.displayName}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground break-all max-w-[250px]">
                      {principalText}
                    </TableCell>
                    <TableCell className="text-right">
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
                                Ta bort författare
                              </>
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Ta bort författare</AlertDialogTitle>
                            <AlertDialogDescription>
                              Är du säker på att du vill ta bort författaren{' '}
                              <strong>"{author.displayName}"</strong>? Alla deras inlägg kommer
                              att raderas permanent. Denna åtgärd kan inte ångras.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Avbryt</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveAuthor(principalText, author.displayName)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Ta bort författare och alla inlägg
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
  );
}
