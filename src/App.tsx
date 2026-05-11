import { useEffect, useRef } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useAuth,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import {
  Switch,
  Route,
  useLocation,
  Redirect,
  Router as WouterRouter,
} from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import NotFound from "@/pages/not-found";
import { Landing } from "@/pages/Landing";
import { Dashboard } from "@/pages/Dashboard";
import { GraphView } from "@/pages/GraphView";
import { GuestGraphView } from "@/pages/GuestGraphView";
import { AdminPage } from "@/pages/AdminPage";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#c026d3",
    colorForeground: "#f8fafc",
    colorMutedForeground: "#94a3b8",
    colorDanger: "#f43f5e",
    colorBackground: "#0b0d18",
    colorInput: "#13162a",
    colorInputForeground: "#f8fafc",
    colorNeutral: "#1f2237",
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0b0d18] border border-[#1f2237] rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButtonText: "text-foreground",
    formFieldLabel: "text-foreground",
    footerActionLink: "text-primary hover:text-primary/80",
    footerActionText: "text-muted-foreground",
    dividerText: "text-muted-foreground",
    identityPreviewEditButton: "text-primary",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-foreground",
    logoBox: "flex justify-center pt-6 pb-2",
    logoImage: "h-9",
    socialButtonsBlockButton: "bg-[#13162a] hover:bg-[#1c1f37] border border-[#1f2237]",
    formButtonPrimary: "bg-primary hover:bg-primary/90 text-white",
    formFieldInput: "bg-[#13162a] border-[#1f2237] text-foreground",
    footerAction: "text-muted-foreground",
    dividerLine: "bg-[#1f2237]",
    alert: "bg-[#13162a] border-[#1f2237]",
    otpCodeFieldInput: "bg-[#13162a] border-[#1f2237] text-foreground",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background px-4">
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/app" />
      </Show>
      <Show when="signed-out">
        <Landing />
      </Show>
    </>
  );
}

function AuthedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkAuthTokenSync() {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenGetter(() => getToken());
    return () => setAuthTokenGetter(null);
  }, [getToken]);
  return null;
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prev = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prev.current !== undefined && prev.current !== id) qc.clear();
      prev.current = id;
    });
    return unsub;
  }, [addListener, qc]);
  return null;
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome to Grops", subtitle: "Sign in to synthesize your neurographs" } },
        signUp: { start: { title: "Create your Grops account", subtitle: "Up to 3 graphs / month on the free tier" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkAuthTokenSync />
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRoute} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            {/* /app is open to everyone — guests get 1 free graph */}
            <Route path="/app" component={Dashboard} />
            {/* Guest graph view reads from localStorage — no auth needed */}
            <Route path="/graphs/guest" component={GuestGraphView} />
            <Route path="/graphs/:id">
              <AuthedRoute>
                <GraphView />
              </AuthedRoute>
            </Route>
            <Route path="/admin">
              <AuthedRoute>
                <AdminPage />
              </AuthedRoute>
            </Route>
            <Route component={NotFound} />
          </Switch>
          <SonnerToaster position="bottom-right" theme="dark" />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
