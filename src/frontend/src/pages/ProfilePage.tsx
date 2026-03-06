import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Check,
  Copy,
  Globe,
  Loader2,
  PenSquare,
  Save,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend";
import { useLanguage } from "../contexts/LanguageContext";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetCallerUserProfile,
  useGetFollowerCount,
  useSaveCallerUserProfile,
  useSetPreferredLanguage,
} from "../hooks/useQueries";
import { LANGUAGES, type LanguageCode } from "../i18n/translations";

// ─── Profile Form ─────────────────────────────────────────────────────────────

interface ProfileFormState {
  name: string;
  email: string;
  phone: string;
  country: string;
}

const EMPTY_FORM: ProfileFormState = {
  name: "",
  email: "",
  phone: "",
  country: "",
};

function ProfileForm() {
  const { data: profile, isLoading, isFetched } = useGetCallerUserProfile();
  const saveProfile = useSaveCallerUserProfile();
  const setPreferredLanguage = useSetPreferredLanguage();
  const { language, setLanguage, t } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);

  // Pre-populate form when profile data arrives
  useEffect(() => {
    if (isFetched) {
      if (profile) {
        setForm({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          country: profile.country,
        });
        setIsEditing(false);
      } else {
        setForm(EMPTY_FORM);
        setIsEditing(true);
      }
    }
  }, [isFetched, profile]);

  const handleSave = async () => {
    try {
      const profileData: UserProfile = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        country: form.country,
        preferredLanguage: profile?.preferredLanguage ?? language,
      };
      await saveProfile.mutateAsync(profileData);
      toast.success(t.profileSaveSuccess);
      setIsEditing(false);
    } catch {
      toast.error(t.profileSaveError);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (profile) {
      setForm({
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        country: profile.country,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setIsEditing(false);
  };

  const handleLanguageChange = async (code: LanguageCode) => {
    // Update context immediately for instant UI feedback
    setLanguage(code);
    try {
      await setPreferredLanguage.mutateAsync(code);
    } catch {
      // Silent fail — language is still updated locally
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/40 shadow-sm">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-serif">
              {t.profileMyProfile}
            </CardTitle>
            <CardDescription className="mt-1">
              {profile ? t.profileSavedInfo : t.profileFillInfo}
            </CardDescription>
          </div>
          {profile && !isEditing && (
            <Badge variant="secondary" className="text-xs">
              {t.profileSaved}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Language/Country selector — always visible */}
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-sm font-medium">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            {t.profileLanguage}
          </Label>
          <Select
            value={
              // Show the country code that maps to the current language, or first matching
              LANGUAGES.find((l) => l.langCode === language)?.code ??
              LANGUAGES[0].code
            }
            onValueChange={(val) => {
              const entry = LANGUAGES.find((l) => l.code === val);
              if (entry?.langCode) {
                handleLanguageChange(entry.langCode);
              }
            }}
            disabled={setPreferredLanguage.isPending}
          >
            <SelectTrigger
              className="w-full"
              data-ocid="profile.language.select"
            >
              <SelectValue>
                {(() => {
                  const entry =
                    LANGUAGES.find((l) => l.langCode === language) ??
                    LANGUAGES[0];
                  return (
                    <span className="flex items-center gap-2">
                      <span className="text-base leading-none">
                        {entry.flag}
                      </span>
                      <span>{entry.label}</span>
                    </span>
                  );
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-72 overflow-y-auto">
              {LANGUAGES.map((entry) => (
                <SelectItem key={entry.code} value={entry.code}>
                  <span className="flex items-center gap-2">
                    <span className="text-base leading-none">{entry.flag}</span>
                    <span className="font-medium">{entry.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {setPreferredLanguage.isPending && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sparar språkinställning...
            </p>
          )}
        </div>

        <Separator />

        {/* Alias */}
        <div className="space-y-1.5">
          <Label
            htmlFor="profile-name"
            className="flex items-center gap-1.5 text-sm font-medium"
          >
            <User className="h-3.5 w-3.5 text-muted-foreground" />
            Ditt Alias
          </Label>
          {isEditing ? (
            <Input
              id="profile-name"
              placeholder={t.profileNamePlaceholder}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              disabled={saveProfile.isPending}
              data-ocid="profile.input"
            />
          ) : (
            <p className="text-sm py-2 px-3 rounded-md bg-muted/40 min-h-[2.5rem] flex items-center">
              {form.name || (
                <span className="text-muted-foreground italic">
                  {t.profileNotSet}
                </span>
              )}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSave}
                disabled={saveProfile.isPending}
                className="gap-2"
                data-ocid="profile.save_button"
              >
                {saveProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saveProfile.isPending ? t.profileSaving : t.profileSave}
              </Button>
              {profile && (
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  disabled={saveProfile.isPending}
                  data-ocid="profile.cancel_button"
                >
                  {t.profileCancel}
                </Button>
              )}
            </>
          ) : (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={saveProfile.isPending}
                className="gap-2"
                data-ocid="profile.save_button"
              >
                {saveProfile.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saveProfile.isPending ? t.profileSaving : t.profileSave}
              </Button>
              <Button
                variant="outline"
                onClick={handleEdit}
                className="gap-2"
                data-ocid="profile.edit_button"
              >
                <PenSquare className="h-4 w-4" />
                {t.profileEdit}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Principal ID Card ────────────────────────────────────────────────────────

function PrincipalIdCard() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const [copied, setCopied] = useState(false);

  if (!isAuthenticated) return null;

  const principalId = identity.getPrincipal().toText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(principalId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <Card
      className="border-border/40 shadow-sm"
      data-ocid="profile.principal.card"
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-serif flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          Ditt Principal ID
        </CardTitle>
        <CardDescription>
          Ditt unika identitets-ID på Internet Computer. Används för att
          verifiera att du loggar in med rätt konto.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 p-3 rounded-md bg-muted/40 border border-border/30">
          <code
            className="flex-1 text-xs font-mono break-all text-foreground"
            data-ocid="profile.principal.panel"
          >
            {principalId}
          </code>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="shrink-0 h-8 w-8"
            title="Kopiera Principal ID"
            data-ocid="profile.principal.button"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Jämför detta ID med det som visas på{" "}
          <a
            href="https://nns.ic0.app"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground transition-colors"
          >
            nns.ic0.app
          </a>{" "}
          för att bekräfta att du använder rätt Internet Identity.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Follower Count ───────────────────────────────────────────────────────────

function FollowerCountCard() {
  const { identity } = useInternetIdentity();
  const isAuthenticated = !!identity && !identity.getPrincipal().isAnonymous();
  const principal = isAuthenticated ? identity.getPrincipal() : undefined;
  const { data: followerCount, isLoading } = useGetFollowerCount(principal);

  if (!isAuthenticated) return null;

  return (
    <Card className="border-border/40 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-serif flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          Dina följare
        </CardTitle>
        <CardDescription>
          Antalet användare som följer dig. Du kan aldrig se vilka de är.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6 text-primary" />
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <div>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {followerCount !== undefined ? Number(followerCount) : 0}
              </p>
              <p className="text-sm text-muted-foreground">följare</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const { data: profile, isFetched } = useGetCallerUserProfile();
  const { setLanguage } = useLanguage();

  // Sync language from backend when profile loads
  useEffect(() => {
    if (isFetched && profile?.preferredLanguage) {
      const lang = profile.preferredLanguage as LanguageCode;
      const validCodes: LanguageCode[] = ["sv", "en", "de", "fr", "zh", "es"];
      if (validCodes.includes(lang)) {
        setLanguage(lang);
      }
    }
  }, [isFetched, profile, setLanguage]);

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={() => navigate({ to: "/" })}
        className="gap-2 mb-6 -ml-2"
      >
        <ArrowLeft className="h-4 w-4" />
        Tillbaka
      </Button>

      <div className="space-y-6">
        <ProfileForm />
        <PrincipalIdCard />
        <FollowerCountCard />
      </div>
    </main>
  );
}
