import { useState } from 'react';
import { useIsCallerAdmin } from '../hooks/useQueries';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, ShieldX, Loader2 } from 'lucide-react';
import AllPostsSection from '../components/admin/AllPostsSection';
import ManageAdminsSection from '../components/admin/ManageAdminsSection';
import ManageAuthorsSection from '../components/admin/ManageAuthorsSection';

export default function AdminPage() {
  const { data: isAdmin, isLoading } = useIsCallerAdmin();
  const [activeTab, setActiveTab] = useState('posts');

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-16 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm">Kontrollerar behörighet...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-6 py-16 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="p-4 rounded-full bg-destructive/10">
            <ShieldX className="h-12 w-12 text-destructive" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Åtkomst nekad</h2>
          <p className="text-muted-foreground">
            Du har inte behörighet att komma åt adminpanelen. Kontakta ägaren för att få åtkomst.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-10 max-w-6xl">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/10">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground tracking-tight">
            Adminpanel
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Hantera inlägg, administratörer och författare
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="posts">Alla inlägg</TabsTrigger>
          <TabsTrigger value="admins">Hantera admins</TabsTrigger>
          <TabsTrigger value="authors">Hantera författare</TabsTrigger>
        </TabsList>

        <TabsContent value="posts">
          <AllPostsSection />
        </TabsContent>

        <TabsContent value="admins">
          <ManageAdminsSection />
        </TabsContent>

        <TabsContent value="authors">
          <ManageAuthorsSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
