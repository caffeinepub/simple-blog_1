import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2, FileText } from 'lucide-react';

interface UnpublishDialogProps {
  open: boolean;
  isDeleting?: boolean;
  isSavingDraft?: boolean;
  onDelete: () => void;
  onSaveDraft: () => void;
  onCancel: () => void;
}

export default function UnpublishDialog({
  open,
  isDeleting = false,
  isSavingDraft = false,
  onDelete,
  onSaveDraft,
  onCancel,
}: UnpublishDialogProps) {
  const isLoading = isDeleting || isSavingDraft;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Avpublicera inlägg</AlertDialogTitle>
          <AlertDialogDescription>
            Du håller på att avpublicera ett publicerat inlägg. Vad vill du göra med det?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3 py-2">
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={isLoading}
            className="w-full justify-start gap-2"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Ta bort permanent
          </Button>

          <Button
            variant="default"
            onClick={onSaveDraft}
            disabled={isLoading}
            className="w-full justify-start gap-2"
          >
            {isSavingDraft ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
            Spara som utkast
          </Button>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            Avbryt
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
