export type LanguageCode = "sv" | "en" | "de" | "fr" | "zh" | "es";

export interface Translations {
  // Login page
  loginTitle: string;
  loginSubtitle: string;
  loginWelcome: string;
  loginDescription: string;
  loginButton: string;
  loginLoading: string;
  loginInitializing: string;
  loginNoAccount: string;
  loginCreateIdentity: string;
  loginPrivacyNote: string;

  // Navigation
  navHome: string;
  navCreate: string;
  navDrafts: string;
  navProfile: string;
  navAdmin: string;
  navLogin: string;
  navLogout: string;

  // Profile page
  profileTitle: string;
  profileMyProfile: string;
  profileSavedInfo: string;
  profileFillInfo: string;
  profileSaved: string;
  profileName: string;
  profileNamePlaceholder: string;
  profileEmail: string;
  profileEmailPlaceholder: string;
  profilePhone: string;
  profilePhonePlaceholder: string;
  profileCountry: string;
  profileCountryPlaceholder: string;
  profileLanguage: string;
  profileSave: string;
  profileSaving: string;
  profileEdit: string;
  profileCancel: string;
  profileSaveSuccess: string;
  profileSaveError: string;
  profileNotSet: string;

  // Language selector
  languageSelectorLabel: string;
}

export const LANGUAGES: { code: LanguageCode; flag: string; label: string }[] =
  [
    { code: "sv", flag: "🇸🇪", label: "SV" },
    { code: "en", flag: "🇬🇧", label: "EN" },
    { code: "de", flag: "🇩🇪", label: "DE" },
    { code: "fr", flag: "🇫🇷", label: "FR" },
    { code: "zh", flag: "🇨🇳", label: "ZH" },
    { code: "es", flag: "🇪🇸", label: "ES" },
  ];

const translations: Record<LanguageCode, Translations> = {
  sv: {
    loginTitle: "HKLO",
    loginSubtitle: "Dela dina berättelser med världen",
    loginWelcome: "Välkommen",
    loginDescription: "Logga in för att skapa och dela dina inlägg",
    loginButton: "Logga in med Internet Identity",
    loginLoading: "Loggar in...",
    loginInitializing: "Laddar...",
    loginNoAccount: "Har du inget konto?",
    loginCreateIdentity: "Skapa Internet Identity",
    loginPrivacyNote:
      "Internet Identity är en säker och anonym autentiseringstjänst som skyddar din integritet.",
    navHome: "Hem",
    navCreate: "Skapa inlägg",
    navDrafts: "Mina utkast",
    navProfile: "Profil",
    navAdmin: "Admin",
    navLogin: "Logga in",
    navLogout: "Logga ut",
    profileTitle: "Min profil",
    profileMyProfile: "Min profil",
    profileSavedInfo: "Din sparade profilinformation.",
    profileFillInfo: "Fyll i din profilinformation (frivilligt).",
    profileSaved: "Sparad",
    profileName: "Namn",
    profileNamePlaceholder: "Ditt namn",
    profileEmail: "E-post",
    profileEmailPlaceholder: "din@epost.se",
    profilePhone: "Telefonnummer",
    profilePhonePlaceholder: "+46 70 000 00 00",
    profileCountry: "Land",
    profileCountryPlaceholder: "Välj land",
    profileLanguage: "Språk",
    profileSave: "Spara",
    profileSaving: "Sparar...",
    profileEdit: "Ändra",
    profileCancel: "Avbryt",
    profileSaveSuccess: "Profilen har sparats!",
    profileSaveError: "Kunde inte spara profilen. Försök igen.",
    profileNotSet: "Ej angivet",
    languageSelectorLabel: "Välj språk",
  },
  en: {
    loginTitle: "HKLO",
    loginSubtitle: "Share your stories with the world",
    loginWelcome: "Welcome",
    loginDescription: "Log in to create and share your posts",
    loginButton: "Log in with Internet Identity",
    loginLoading: "Logging in...",
    loginInitializing: "Loading...",
    loginNoAccount: "Don't have an account?",
    loginCreateIdentity: "Create Internet Identity",
    loginPrivacyNote:
      "Internet Identity is a secure and anonymous authentication service that protects your privacy.",
    navHome: "Home",
    navCreate: "Create post",
    navDrafts: "My drafts",
    navProfile: "Profile",
    navAdmin: "Admin",
    navLogin: "Log in",
    navLogout: "Log out",
    profileTitle: "My profile",
    profileMyProfile: "My profile",
    profileSavedInfo: "Your saved profile information.",
    profileFillInfo: "Fill in your profile information (optional).",
    profileSaved: "Saved",
    profileName: "Name",
    profileNamePlaceholder: "Your name",
    profileEmail: "Email",
    profileEmailPlaceholder: "your@email.com",
    profilePhone: "Phone number",
    profilePhonePlaceholder: "+1 555 000 0000",
    profileCountry: "Country",
    profileCountryPlaceholder: "Select country",
    profileLanguage: "Language",
    profileSave: "Save",
    profileSaving: "Saving...",
    profileEdit: "Edit",
    profileCancel: "Cancel",
    profileSaveSuccess: "Profile saved!",
    profileSaveError: "Could not save profile. Please try again.",
    profileNotSet: "Not set",
    languageSelectorLabel: "Select language",
  },
  de: {
    loginTitle: "HKLO",
    loginSubtitle: "Teile deine Geschichten mit der Welt",
    loginWelcome: "Willkommen",
    loginDescription: "Melde dich an, um Beiträge zu erstellen und zu teilen",
    loginButton: "Mit Internet Identity anmelden",
    loginLoading: "Anmelden...",
    loginInitializing: "Laden...",
    loginNoAccount: "Noch kein Konto?",
    loginCreateIdentity: "Internet Identity erstellen",
    loginPrivacyNote:
      "Internet Identity ist ein sicherer und anonymer Authentifizierungsdienst, der deine Privatsphäre schützt.",
    navHome: "Startseite",
    navCreate: "Beitrag erstellen",
    navDrafts: "Meine Entwürfe",
    navProfile: "Profil",
    navAdmin: "Admin",
    navLogin: "Anmelden",
    navLogout: "Abmelden",
    profileTitle: "Mein Profil",
    profileMyProfile: "Mein Profil",
    profileSavedInfo: "Deine gespeicherten Profilinformationen.",
    profileFillInfo: "Fülle deine Profilinformationen aus (optional).",
    profileSaved: "Gespeichert",
    profileName: "Name",
    profileNamePlaceholder: "Dein Name",
    profileEmail: "E-Mail",
    profileEmailPlaceholder: "deine@email.de",
    profilePhone: "Telefonnummer",
    profilePhonePlaceholder: "+49 170 000 0000",
    profileCountry: "Land",
    profileCountryPlaceholder: "Land auswählen",
    profileLanguage: "Sprache",
    profileSave: "Speichern",
    profileSaving: "Speichern...",
    profileEdit: "Bearbeiten",
    profileCancel: "Abbrechen",
    profileSaveSuccess: "Profil gespeichert!",
    profileSaveError:
      "Profil konnte nicht gespeichert werden. Bitte erneut versuchen.",
    profileNotSet: "Nicht angegeben",
    languageSelectorLabel: "Sprache auswählen",
  },
  fr: {
    loginTitle: "HKLO",
    loginSubtitle: "Partagez vos histoires avec le monde",
    loginWelcome: "Bienvenue",
    loginDescription: "Connectez-vous pour créer et partager vos publications",
    loginButton: "Se connecter avec Internet Identity",
    loginLoading: "Connexion...",
    loginInitializing: "Chargement...",
    loginNoAccount: "Vous n'avez pas de compte ?",
    loginCreateIdentity: "Créer une Internet Identity",
    loginPrivacyNote:
      "Internet Identity est un service d'authentification sécurisé et anonyme qui protège votre vie privée.",
    navHome: "Accueil",
    navCreate: "Créer un article",
    navDrafts: "Mes brouillons",
    navProfile: "Profil",
    navAdmin: "Admin",
    navLogin: "Se connecter",
    navLogout: "Se déconnecter",
    profileTitle: "Mon profil",
    profileMyProfile: "Mon profil",
    profileSavedInfo: "Vos informations de profil enregistrées.",
    profileFillInfo: "Remplissez vos informations de profil (facultatif).",
    profileSaved: "Enregistré",
    profileName: "Nom",
    profileNamePlaceholder: "Votre nom",
    profileEmail: "E-mail",
    profileEmailPlaceholder: "votre@email.fr",
    profilePhone: "Numéro de téléphone",
    profilePhonePlaceholder: "+33 6 00 00 00 00",
    profileCountry: "Pays",
    profileCountryPlaceholder: "Sélectionner un pays",
    profileLanguage: "Langue",
    profileSave: "Enregistrer",
    profileSaving: "Enregistrement...",
    profileEdit: "Modifier",
    profileCancel: "Annuler",
    profileSaveSuccess: "Profil enregistré !",
    profileSaveError: "Impossible d'enregistrer le profil. Veuillez réessayer.",
    profileNotSet: "Non renseigné",
    languageSelectorLabel: "Choisir la langue",
  },
  zh: {
    loginTitle: "HKLO",
    loginSubtitle: "与世界分享您的故事",
    loginWelcome: "欢迎",
    loginDescription: "登录以创建和分享您的帖子",
    loginButton: "使用 Internet Identity 登录",
    loginLoading: "登录中...",
    loginInitializing: "加载中...",
    loginNoAccount: "没有账户？",
    loginCreateIdentity: "创建 Internet Identity",
    loginPrivacyNote:
      "Internet Identity 是一种安全且匿名的身份验证服务，可保护您的隐私。",
    navHome: "首页",
    navCreate: "创建帖子",
    navDrafts: "我的草稿",
    navProfile: "个人资料",
    navAdmin: "管理员",
    navLogin: "登录",
    navLogout: "退出登录",
    profileTitle: "我的资料",
    profileMyProfile: "我的资料",
    profileSavedInfo: "您已保存的个人资料信息。",
    profileFillInfo: "填写您的个人资料信息（可选）。",
    profileSaved: "已保存",
    profileName: "姓名",
    profileNamePlaceholder: "您的姓名",
    profileEmail: "电子邮件",
    profileEmailPlaceholder: "your@email.com",
    profilePhone: "电话号码",
    profilePhonePlaceholder: "+86 138 0000 0000",
    profileCountry: "国家",
    profileCountryPlaceholder: "选择国家",
    profileLanguage: "语言",
    profileSave: "保存",
    profileSaving: "保存中...",
    profileEdit: "编辑",
    profileCancel: "取消",
    profileSaveSuccess: "个人资料已保存！",
    profileSaveError: "无法保存个人资料，请重试。",
    profileNotSet: "未填写",
    languageSelectorLabel: "选择语言",
  },
  es: {
    loginTitle: "HKLO",
    loginSubtitle: "Comparte tus historias con el mundo",
    loginWelcome: "Bienvenido",
    loginDescription: "Inicia sesión para crear y compartir tus publicaciones",
    loginButton: "Iniciar sesión con Internet Identity",
    loginLoading: "Iniciando sesión...",
    loginInitializing: "Cargando...",
    loginNoAccount: "¿No tienes cuenta?",
    loginCreateIdentity: "Crear Internet Identity",
    loginPrivacyNote:
      "Internet Identity es un servicio de autenticación seguro y anónimo que protege tu privacidad.",
    navHome: "Inicio",
    navCreate: "Crear publicación",
    navDrafts: "Mis borradores",
    navProfile: "Perfil",
    navAdmin: "Admin",
    navLogin: "Iniciar sesión",
    navLogout: "Cerrar sesión",
    profileTitle: "Mi perfil",
    profileMyProfile: "Mi perfil",
    profileSavedInfo: "Tu información de perfil guardada.",
    profileFillInfo: "Completa tu información de perfil (opcional).",
    profileSaved: "Guardado",
    profileName: "Nombre",
    profileNamePlaceholder: "Tu nombre",
    profileEmail: "Correo electrónico",
    profileEmailPlaceholder: "tu@correo.es",
    profilePhone: "Número de teléfono",
    profilePhonePlaceholder: "+34 600 000 000",
    profileCountry: "País",
    profileCountryPlaceholder: "Seleccionar país",
    profileLanguage: "Idioma",
    profileSave: "Guardar",
    profileSaving: "Guardando...",
    profileEdit: "Editar",
    profileCancel: "Cancelar",
    profileSaveSuccess: "¡Perfil guardado!",
    profileSaveError: "No se pudo guardar el perfil. Inténtalo de nuevo.",
    profileNotSet: "No especificado",
    languageSelectorLabel: "Seleccionar idioma",
  },
};

export default translations;
