import { useAuth, RedirectToSignIn } from '@clerk/react';

export default function AuthRequired({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;
  if (!isSignedIn) return <RedirectToSignIn />;

  return <>{children}</>;
}
